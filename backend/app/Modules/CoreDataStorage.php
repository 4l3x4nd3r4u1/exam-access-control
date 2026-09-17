<?php

namespace App\Modules;

use App\DTOs\RawFileData;
use App\DTOs\ImportSummary;
use App\DTOs\UserSession;
use App\DTOs\UserSummary;
use App\DTOs\CourseGroupSummary;
use App\Exceptions\InvalidCredentialsException;
use App\Models\User;
use App\Models\Student;
use App\Models\CourseGroup;
use App\Models\StudentCourseEnrollment;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;

class CoreDataStorage
{
    /**
     * Authenticates a user by email and password, returning an authenticated UserSession with JWT.
     *
     * @param string $email User email
     * @param string $password Plaintext password
     * @return UserSession
     * @throws InvalidCredentialsException
     */
    public function authenticate(string $email, string $password): UserSession
    {
        $user = User::where('email', strtolower(trim($email)))->first();

        if (!$user) {
            throw new InvalidCredentialsException('Credenciales incorrectas');
        }

        if (!Hash::check($password, $user->password)) {
            throw new InvalidCredentialsException('Credenciales incorrectas');
        }

        if (!$user->is_active) {
            throw new InvalidCredentialsException('Usuario inactivo o deshabilitado');
        }

        $token = JWTAuth::fromUser($user);
        $ttlMinutes = (int) config('jwt.ttl', 360);

        return new UserSession(
            userId: (int) $user->id,
            role: (string) $user->role,
            fullName: (string) $user->name,
            email: (string) $user->email,
            token: $token,
            isActive: (bool) $user->is_active,
            tokenType: 'bearer',
            expiresIn: $ttlMinutes * 60,
        );
    }

    /**
     * Retrieves all active academic staff members ordered alphabetically by name.
     *
     * @return array<UserSummary>
     */
    public function getAcademicStaff(): array
    {
        $users = User::where('is_active', true)
            ->orderBy('name', 'asc')
            ->get();

        return $users->map(fn(User $user) => new UserSummary(
            userId: (int) $user->id,
            fullName: (string) $user->name,
            email: (string) $user->email,
            role: (string) $user->role,
            isActive: (bool) $user->is_active,
        ))->all();
    }

    /**
     * Retrieves all course groups assigned to a specific teacher with the enrolled student count.
     *
     * @param int $teacherId
     * @return array<CourseGroupSummary>
     */
    public function getTeacherCourses(int $teacherId): array
    {
        $courses = CourseGroup::where('teacher_id', $teacherId)
            ->withCount('enrollments')
            ->orderBy('subject_code', 'asc')
            ->orderBy('group_code', 'asc')
            ->get();

        return $courses->map(fn(CourseGroup $c) => new CourseGroupSummary(
            courseGroupId: (string) $c->course_group_id,
            subjectCode: (string) $c->subject_code,
            subjectName: (string) $c->subject_name,
            groupCode: (string) $c->group_code,
            academicTerm: (string) $c->academic_term,
            totalEnrolled: (int) ($c->enrollments_count ?? 0),
            teacherId: (int) $c->teacher_id,
        ))->all();
    }

    /**
     * Mandatory column headers required in the roster file.
     */
    private const REQUIRED_COLUMNS = [
        'codigo_sis',
        'ci',
        'nombre_completo',
        'sigla_materia',
        'nombre_materia',
        'grupo',
        'gestion',
        'email_docente',
    ];

    /**
     * Imports official student roster from a CSV or Excel file.
     *
     * @param RawFileData $fileData Object containing uploaded file data
     * @return ImportSummary Structured processing summary
     */
    public function importStudentRoster(RawFileData $fileData): ImportSummary
    {
        $extension = strtolower(trim($fileData->extension, '. '));

        if ($extension === 'csv') {
            return $this->processCsv($fileData);
        }

        if (in_array($extension, ['xlsx', 'xls'])) {
            return $this->processExcel($fileData);
        }

        return new ImportSummary(
            totalProcessed: 0,
            successful: 0,
            skipped: 0,
            observations: ["Unsupported file format: .{$extension}. Supported formats are .csv and .xlsx"],
            isSuccessful: false
        );
    }

    /**
     * Processes parsing and validation of a CSV file.
     */
    private function processCsv(RawFileData $fileData): ImportSummary
    {
        $content = trim($fileData->content);

        if (empty($content)) {
            return new ImportSummary(
                totalProcessed: 0,
                successful: 0,
                skipped: 0,
                observations: ['The CSV file is empty.'],
                isSuccessful: false
            );
        }

        $stream = fopen('php://memory', 'r+');
        fwrite($stream, $content);
        rewind($stream);

        $rawHeaders = fgetcsv($stream, escape: "\\");

        if ($rawHeaders === false || empty($rawHeaders)) {
            fclose($stream);
            return new ImportSummary(
                totalProcessed: 0,
                successful: 0,
                skipped: 0,
                observations: ['Unable to read headers from CSV file.'],
                isSuccessful: false
            );
        }

        $headerMap = $this->mapHeaders($rawHeaders);
        $missingColumns = $this->findMissingColumns($headerMap);

        if (!empty($missingColumns)) {
            fclose($stream);
            return new ImportSummary(
                totalProcessed: 0,
                successful: 0,
                skipped: 0,
                observations: ['Missing required column headers: ' . implode(', ', $missingColumns)],
                isSuccessful: false
            );
        }

        $totalProcessed = 0;
        $successful = 0;
        $skipped = 0;
        $observations = [];
        $rowNumber = 1; // Row 1 is header
        $validRows = [];
        $expectedColumnCount = count($rawHeaders);

        while (($row = fgetcsv($stream, escape: "\\")) !== false) {
            $rowNumber++;

            // Skip completely empty rows
            if ($this->isEmptyRow($row)) {
                continue;
            }

            $totalProcessed++;

            // Structural validation: check column count against headers
            if (count($row) !== $expectedColumnCount) {
                $skipped++;
                $observations[] = "Row {$rowNumber}: Malformed row. Expected {$expectedColumnCount} columns, but found " . count($row) . ".";
                continue;
            }

            // Extract row fields using mapped header indices
            $rowData = $this->extractRowData($row, $headerMap);
            $validationError = $this->validateRowData($rowData, $rowNumber);

            if ($validationError !== null) {
                $skipped++;
                $observations[] = $validationError;
                continue;
            }

            // Build canonical domain identifiers (Parnas design)
            $studentKey = $rowData['codigo_sis'];
            $courseGroupId = $this->buildCourseGroupId(
                sigla: $rowData['sigla_materia'],
                grupo: $rowData['grupo'],
                gestion: $rowData['gestion']
            );

            $validRows[] = [
                'rowNumber' => $rowNumber,
                'rowData' => $rowData,
                'studentKey' => $studentKey,
                'courseGroupId' => $courseGroupId,
            ];
        }

        fclose($stream);

        if (empty($validRows)) {
            return new ImportSummary(
                totalProcessed: $totalProcessed,
                successful: 0,
                skipped: $skipped,
                observations: $observations,
                isSuccessful: false
            );
        }

        // High-Performance Bulk Persistence in a single Database Transaction
        try {
            DB::transaction(function () use ($validRows) {
                $now = now();

                // 1. Resolve / Create Teacher Users in bulk
                $teacherEmails = array_values(array_unique(array_map(
                    fn($item) => strtolower(trim($item['rowData']['email_docente'])),
                    $validRows
                )));

                $existingTeachers = User::whereIn('email', $teacherEmails)->get()->keyBy('email');
                $defaultPasswordHash = null;

                foreach ($teacherEmails as $email) {
                    if (!$existingTeachers->has($email)) {
                        $defaultPasswordHash ??= bcrypt('password123');
                        $newTeacher = User::create([
                            'email' => $email,
                            'name' => 'Docente ' . $email,
                            'role' => 'TEACHER',
                            'password' => $defaultPasswordHash,
                            'is_active' => true,
                        ]);
                        $existingTeachers->put($email, $newTeacher);
                    }
                }

                // 2. Prepare & Upsert CourseGroups in bulk
                $courseGroupsData = [];
                foreach ($validRows as $item) {
                    $cgId = $item['courseGroupId'];
                    if (!isset($courseGroupsData[$cgId])) {
                        $r = $item['rowData'];
                        $teacher = $existingTeachers->get(strtolower(trim($r['email_docente'])));
                        $courseGroupsData[$cgId] = [
                            'course_group_id' => $cgId,
                            'subject_code' => strtoupper(trim($r['sigla_materia'])),
                            'subject_name' => trim($r['nombre_materia']),
                            'group_code' => strtoupper(trim($r['grupo'])),
                            'academic_term' => trim($r['gestion']),
                            'teacher_id' => $teacher?->id,
                            'created_at' => $now,
                            'updated_at' => $now,
                        ];
                    }
                }
                CourseGroup::upsert(
                    array_values($courseGroupsData),
                    ['course_group_id'],
                    ['subject_code', 'subject_name', 'group_code', 'academic_term', 'teacher_id', 'updated_at']
                );

                // 3. Prepare & Upsert Students in bulk
                $studentsData = [];
                foreach ($validRows as $item) {
                    $sKey = $item['studentKey'];
                    $r = $item['rowData'];
                    $studentsData[$sKey] = [
                        'student_key' => $sKey,
                        'ci' => trim($r['ci']),
                        'full_name' => trim($r['nombre_completo']),
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                }
                Student::upsert(
                    array_values($studentsData),
                    ['student_key'],
                    ['ci', 'full_name', 'updated_at']
                );

                // 4. Prepare & Upsert Student Course Enrollments in bulk
                $enrollmentsData = [];
                foreach ($validRows as $item) {
                    $enrollmentKey = $item['studentKey'] . ':::' . $item['courseGroupId'];
                    $enrollmentsData[$enrollmentKey] = [
                        'student_key' => $item['studentKey'],
                        'course_group_id' => $item['courseGroupId'],
                        'status' => 'HABILITADO',
                        'ineligibility_reason' => null,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                }
                StudentCourseEnrollment::upsert(
                    array_values($enrollmentsData),
                    ['student_key', 'course_group_id'],
                    ['status', 'updated_at']
                );
            });

            $successful = count($validRows);
        } catch (\Throwable $e) {
            $skipped += count($validRows);
            $observations[] = "Bulk import transaction error: " . $e->getMessage();
            $successful = 0;
        }

        return new ImportSummary(
            totalProcessed: $totalProcessed,
            successful: $successful,
            skipped: $skipped,
            observations: $observations,
            isSuccessful: $successful > 0
        );
    }

    /**
     * Processes parsing and persistence of an Excel file.
     */
    private function processExcel(RawFileData $fileData): ImportSummary
    {
        // TODO: Implement parsing via PhpSpreadsheet
        return new ImportSummary(
            totalProcessed: 0,
            successful: 0,
            skipped: 0,
            observations: ['Excel parsing will be implemented with PhpSpreadsheet.'],
            isSuccessful: true
        );
    }

    /**
     * Maps and normalizes raw headers to their corresponding column indices.
     *
     * @param array<string> $rawHeaders
     * @return array<string, int> Map of normalized header name to column index
     */
    private function mapHeaders(array $rawHeaders): array
    {
        $map = [];

        foreach ($rawHeaders as $index => $header) {
            $normalized = strtolower(trim($header));
            // Remove special characters, accents, and normalize spaces to underscores
            $normalized = preg_replace('/[^a-z0-9_]/', '_', $normalized);
            $normalized = trim(preg_replace('/_+/', '_', $normalized), '_');

            $map[$normalized] = $index;
        }

        return $map;
    }

    /**
     * Checks if any required columns are missing from the header map.
     *
     * @param array<string, int> $headerMap
     * @return array<string> List of missing column names
     */
    private function findMissingColumns(array $headerMap): array
    {
        $missing = [];

        foreach (self::REQUIRED_COLUMNS as $required) {
            if (!array_key_exists($required, $headerMap)) {
                $missing[] = $required;
            }
        }

        return $missing;
    }

    /**
     * Extracts values from a row according to header positions.
     *
     * @param array<string> $row
     * @param array<string, int> $headerMap
     * @return array<string, string>
     */
    private function extractRowData(array $row, array $headerMap): array
    {
        $data = [];

        foreach (self::REQUIRED_COLUMNS as $column) {
            $index = $headerMap[$column] ?? null;
            $data[$column] = ($index !== null && isset($row[$index])) ? trim($row[$index]) : '';
        }

        return $data;
    }

    /**
     * Validates that all required row fields contain non-empty values.
     *
     * @param array<string, string> $rowData
     * @param int $rowNumber
     * @return string|null Error description or null if valid
     */
    private function validateRowData(array $rowData, int $rowNumber): ?string
    {
        if (empty($rowData['codigo_sis'])) {
            return "Row {$rowNumber}: Missing student SIS code (codigo_sis).";
        }

        if (empty($rowData['ci'])) {
            return "Row {$rowNumber}: Missing student CI (ci).";
        }

        if (empty($rowData['nombre_completo'])) {
            return "Row {$rowNumber}: Missing student full name (nombre_completo).";
        }

        if (empty($rowData['sigla_materia'])) {
            return "Row {$rowNumber}: Missing subject code (sigla_materia).";
        }

        if (empty($rowData['grupo'])) {
            return "Row {$rowNumber}: Missing group/parallel (grupo).";
        }

        if (empty($rowData['gestion'])) {
            return "Row {$rowNumber}: Missing academic term (gestion).";
        }

        if (empty($rowData['email_docente'])) {
            return "Row {$rowNumber}: Missing teacher email (email_docente).";
        }

        return null;
    }

    /**
     * Constructs canonical CourseGroupId (e.g. 'INF110-G1-2/2026').
     */
    private function buildCourseGroupId(string $sigla, string $grupo, string $gestion): string
    {
        $siglaClean = strtoupper(trim($sigla));
        $grupoClean = strtoupper(trim($grupo));
        $gestionClean = trim($gestion);

        return "{$siglaClean}-G{$grupoClean}-{$gestionClean}";
    }

    /**
     * Checks if a row is completely empty or contains only whitespace.
     *
     * @param array<string>|null $row
     */
    private function isEmptyRow(?array $row): bool
    {
        if ($row === null || empty($row)) {
            return true;
        }

        foreach ($row as $cell) {
            if (trim((string) $cell) !== '') {
                return false;
            }
        }

        return true;
    }
}
