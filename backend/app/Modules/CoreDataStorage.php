<?php

namespace App\Modules;

use App\DTOs\ProcessedRosterSummary;
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
use App\DTOs\UserRegistrationData;
use App\DTOs\UserUpdateData;
use App\DTOs\OperationResult;


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
     * Registers a new academic user in the system.
     *
     * @param UserRegistrationData $data
     * @return OperationResult
     */
    public function registerAcademicUser(UserRegistrationData $data): OperationResult
    {
        $email = strtolower(trim($data->email));

        // Validate institutional email domain
        if (!str_ends_with($email, '@umss.edu.bo')) {
            return new OperationResult(
                isSuccessful: false,
                message: 'El correo debe pertenecer al dominio institucional @umss.edu.bo'
            );
        }

        // Check if email already exists
        if (User::where('email', $email)->exists()) {
            return new OperationResult(
                isSuccessful: false,
                message: 'El correo ya está registrado'
            );
        }

        // Convert functional roles to database roles
        $role = match ($data->role) {
            'DOCENTE' => 'TEACHER',
            'AUXILIAR' => 'ASSISTANT',
            'ADMIN' => 'ADMIN',
            default => null
        };

        if ($role === null) {
            return new OperationResult(
                isSuccessful: false,
                message: 'Rol no válido'
            );
        }

        try {
            User::create([
                'name' => $data->fullName,
                'email' => $email,
                'password' => $data->password,
                'role' => $role,
                'is_active' => true,
            ]);

            return new OperationResult(
                isSuccessful: true,
                message: 'Usuario registrado correctamente'
            );

        } catch (\Throwable $e) {
            return new OperationResult(
                isSuccessful: false,
                message: 'Error al registrar usuario: ' . $e->getMessage()
            );
        }
    }

    /**
     * Updates an existing academic user in the system.
     *
     * @param int $userId
     * @param UserUpdateData $data
     * @return OperationResult
     */
    public function updateAcademicUser(int $userId, UserUpdateData $data): OperationResult
    {
        $user = User::find($userId);

        if (!$user) {
            return new OperationResult(
                isSuccessful: false,
                message: 'Usuario no encontrado'
            );
        }

        $email = strtolower(trim($data->email));

        // Validate institutional email domain
        if (!str_ends_with($email, '@umss.edu.bo')) {
            return new OperationResult(
                isSuccessful: false,
                message: 'El correo debe pertenecer al dominio institucional @umss.edu.bo'
            );
        }

        // Check if email already belongs to another user
        if (User::where('email', $email)->where('id', '!=', $userId)->exists()) {
            return new OperationResult(
                isSuccessful: false,
                message: 'El correo ya está registrado por otro usuario'
            );
        }

        // Convert functional roles to database roles
        $role = match ($data->role) {
            'DOCENTE' => 'TEACHER',
            'AUXILIAR' => 'ASSISTANT',
            'ADMIN' => 'ADMIN',
            default => null
        };

        if ($role === null) {
            return new OperationResult(
                isSuccessful: false,
                message: 'Rol no válido'
            );
        }

        try {
            $user->name = $data->fullName;
            $user->email = $email;
            $user->role = $role;

            if (!empty($data->newPassword)) {
                $user->password = $data->newPassword;
            }

            $user->save();

            return new OperationResult(
                isSuccessful: true,
                message: 'Usuario actualizado correctamente'
            );
        } catch (\Throwable $e) {
            return new OperationResult(
                isSuccessful: false,
                message: 'Error al actualizar usuario: ' . $e->getMessage()
            );
        }
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
    * Retrieves all processed course rosters with the enrolled student count.
    *
    *   @return array<ProcessedRosterSummary>
    */
    public function getProcessedRosters(): array
    {
        $courses = CourseGroup::withCount('enrollments')
            ->orderBy('subject_code', 'asc')
            ->orderBy('group_code', 'asc')
            ->get();

        return $courses->map(fn(CourseGroup $course) => new ProcessedRosterSummary(
            courseGroupId: (string) $course->course_group_id,
            subjectCode: (string) $course->subject_code,
            subjectName: (string) $course->subject_name,
            groupCode: (string) $course->group_code,
            academicTerm: (string) $course->academic_term,
            totalStudents: (int) ($course->enrollments_count ?? 0),
        ))->all();
    }

    /**
     * Retrieves all enrolled students for a specific course group.
     *
     * @param string $courseGroupId
     * @return array<int, array{studentKey: string, sis: string, ci: string, fullName: string, status: string, ineligibilityReason: ?string}>
     */
    public function getCourseStudents(string $courseGroupId): array
    {
        $cleanCourseGroupId = trim($courseGroupId);

        $course = CourseGroup::where('course_group_id', $cleanCourseGroupId)->first();
        if (!$course) {
            return [];
        }

        $students = $course->students()->orderBy('full_name', 'asc')->get();

        return $students->map(function ($student) {
            $rawStatus = strtoupper(trim((string) ($student->pivot->status ?? 'HABILITADO')));
            $formattedStatus = in_array($rawStatus, ['HABILITADO', 'ELIGIBLE', 'ENABLED'], true)
                ? 'Habilitado'
                : 'Inhabilitado';

            return [
                'studentKey' => (string) $student->student_key,
                'sis' => (string) $student->student_key,
                'ci' => (string) $student->ci,
                'fullName' => (string) $student->full_name,
                'status' => $formattedStatus,
                'ineligibilityReason' => $student->pivot->ineligibility_reason ? (string) $student->pivot->ineligibility_reason : null,
            ];
        })->all();
    }

    /**
     * Retrieves full roster detail with course info and enrolled students.
     *
     * @param string $courseGroupId
     * @return array{roster: array, students: array}|null
     */
    public function getProcessedRosterDetail(string $courseGroupId): ?array
    {
        $cleanCourseGroupId = trim($courseGroupId);

        $course = CourseGroup::where('course_group_id', $cleanCourseGroupId)
            ->with(['teacher'])
            ->withCount('enrollments')
            ->first();

        if (!$course) {
            return null;
        }

        $students = $this->getCourseStudents($cleanCourseGroupId);

        return [
            'roster' => [
                'courseGroupId' => (string) $course->course_group_id,
                'subjectCode' => (string) $course->subject_code,
                'subjectName' => (string) $course->subject_name,
                'groupCode' => (string) $course->group_code,
                'academicTerm' => (string) $course->academic_term,
                'teacherName' => $course->teacher ? (string) $course->teacher->name : null,
                'totalEnrolled' => (int) ($course->enrollments_count ?? count($students)),
                'updatedAt' => $course->updated_at ? $course->updated_at->toIso8601String() : null,
            ],
            'students' => $students,
        ];
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
            isSuccessful: false,
            failedRows: []
        );
    }

    /**
     * Generates standard CSV template content for student roster import.
     */
    public function generateCsvTemplate(): string
    {
        return "Docente: Lic. Juan Carlos Perez Gomez\n"
            . "Email Docente: juan.perez@umss.edu.bo\n"
            . "Materia: INF110 - INTRODUCCION A LA PROGRAMACION\n"
            . "Grupo: 1\n"
            . "Gestion: 2/2026\n\n"
            . "Codigo SIS,CI,Nombre Completo\n"
            . "202001234,7891234,ALVAREZ CLAROS PEDRO\n"
            . "202005678,6543210,BENITEZ LOPEZ CARMEN\n"
            . "202109876,8912345,CASTRO ROJAS MARIO\n";
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
                isSuccessful: false,
                failedRows: []
            );
        }

        $stream = fopen('php://memory', 'r+');
        fwrite($stream, $content);
        rewind($stream);

        $rows = [];
        while (($row = fgetcsv($stream, escape: "\\")) !== false) {
            $rows[] = $row;
        }
        fclose($stream);

        if (empty($rows)) {
            return new ImportSummary(
                totalProcessed: 0,
                successful: 0,
                skipped: 0,
                observations: ['Unable to read headers from CSV file.'],
                isSuccessful: false,
                failedRows: []
            );
        }

        // Detect if the file uses legacy flat format or template format with metadata
        $firstNonEmptyRow = null;
        foreach ($rows as $r) {
            if (!$this->isEmptyRow($r)) {
                $firstNonEmptyRow = $r;
                break;
            }
        }

        if ($firstNonEmptyRow === null) {
            return new ImportSummary(
                totalProcessed: 0,
                successful: 0,
                skipped: 0,
                observations: ['The CSV file is empty.'],
                isSuccessful: false,
                failedRows: []
            );
        }

        $firstHeaderMap = $this->mapHeaders($firstNonEmptyRow);
        $isLegacyFlat = array_key_exists('codigo_sis', $firstHeaderMap)
            && array_key_exists('sigla_materia', $firstHeaderMap)
            && array_key_exists('email_docente', $firstHeaderMap);

        if ($isLegacyFlat) {
            return $this->processLegacyFlatCsv($rows, $firstHeaderMap);
        }

        return $this->processTemplateCsv($rows);
    }

    /**
     * Processes template CSV containing metadata header block and student table.
     *
     * @param array<array<string|null>> $rows
     */
    private function processTemplateCsv(array $rows): ImportSummary
    {
        $metadata = [];
        $tableHeaderIndex = null;
        $studentHeaderMap = [];

        // 1. Scan for metadata and student table header
        foreach ($rows as $index => $row) {
            if ($this->isEmptyRow($row)) {
                continue;
            }

            $candidateMap = $this->mapHeaders($row);
            if (array_key_exists('codigo_sis', $candidateMap) && array_key_exists('ci', $candidateMap)) {
                $tableHeaderIndex = $index;
                $studentHeaderMap = $candidateMap;
                break;
            }

            $this->extractMetadataFromRow($row, $metadata);
        }

        // 2. Validate metadata
        $missingMeta = $this->findMissingMetadata($metadata);
        if (!empty($missingMeta)) {
            return new ImportSummary(
                totalProcessed: 0,
                successful: 0,
                skipped: 0,
                observations: ['Faltan metadatos requeridos en el encabezado: ' . implode(', ', $missingMeta) . '. Puede descargar la plantilla oficial.'],
                isSuccessful: false,
                failedRows: []
            );
        }

        // 3. Validate student table headers
        if ($tableHeaderIndex === null) {
            return new ImportSummary(
                totalProcessed: 0,
                successful: 0,
                skipped: 0,
                observations: ['No se encontró la cabecera de la tabla de estudiantes (Codigo SIS, CI, Nombre Completo). Puede descargar la plantilla oficial.'],
                isSuccessful: false,
                failedRows: []
            );
        }

        $missingCols = $this->findMissingStudentColumns($studentHeaderMap);
        if (!empty($missingCols)) {
            return new ImportSummary(
                totalProcessed: 0,
                successful: 0,
                skipped: 0,
                observations: ['Missing required column headers: ' . implode(', ', $missingCols)],
                isSuccessful: false,
                failedRows: []
            );
        }

        $courseGroupId = $this->buildCourseGroupId(
            sigla: $metadata['subject_code'],
            grupo: $metadata['group_code'],
            gestion: $metadata['academic_term']
        );

        $totalProcessed = 0;
        $skipped = 0;
        $observations = [];
        $failedRows = [];
        $validRows = [];

        // 4. Iterate student rows
        for ($i = $tableHeaderIndex + 1; $i < count($rows); $i++) {
            $row = $rows[$i];
            $rowNumber = $i + 1;

            if ($this->isEmptyRow($row)) {
                continue;
            }

            $totalProcessed++;

            $sisIndex = $studentHeaderMap['codigo_sis'] ?? null;
            $ciIndex = $studentHeaderMap['ci'] ?? null;
            $nameIndex = $studentHeaderMap['nombre_completo'] ?? null;

            $sis = ($sisIndex !== null && isset($row[$sisIndex])) ? trim((string)$row[$sisIndex]) : '';
            $ci = ($ciIndex !== null && isset($row[$ciIndex])) ? trim((string)$row[$ciIndex]) : '';
            $name = ($nameIndex !== null && isset($row[$nameIndex])) ? trim((string)$row[$nameIndex]) : '';

            $rawRowData = [
                'codigo_sis' => $sis,
                'ci' => $ci,
                'nombre_completo' => $name,
            ];

            $errors = [];
            if (empty($sis)) {
                $errors[] = 'Falta Código SIS del estudiante.';
            }
            if (empty($ci)) {
                $errors[] = 'Falta CI del estudiante.';
            }
            if (empty($name)) {
                $errors[] = 'Falta Nombre Completo del estudiante.';
            }

            if (!empty($errors)) {
                $skipped++;
                $reason = implode(' ', $errors);
                $observations[] = "Row {$rowNumber}: {$reason}";
                $failedRows[] = [
                    'rowNumber' => $rowNumber,
                    'reason' => $reason,
                    'data' => $rawRowData,
                ];
                continue;
            }

            $validRows[] = [
                'rowNumber' => $rowNumber,
                'studentKey' => $sis,
                'ci' => $ci,
                'fullName' => $name,
                'courseGroupId' => $courseGroupId,
            ];
        }

        $extractedMetadata = [
            'teacherName' => $metadata['teacher_name'] ?? null,
            'teacherEmail' => $metadata['teacher_email'] ?? null,
            'subjectCode' => $metadata['subject_code'] ?? null,
            'subjectName' => $metadata['subject_name'] ?? null,
            'groupCode' => $metadata['group_code'] ?? null,
            'academicTerm' => $metadata['academic_term'] ?? null,
        ];

        if (empty($validRows)) {
            return new ImportSummary(
                totalProcessed: $totalProcessed,
                successful: 0,
                skipped: $skipped,
                observations: $observations,
                isSuccessful: false,
                failedRows: $failedRows,
                metadata: $extractedMetadata
            );
        }

        // 5. Bulk Persistence in Database Transaction
        try {
            DB::transaction(function () use ($metadata, $validRows, $courseGroupId) {
                $now = now();

                // Teacher
                $email = strtolower(trim($metadata['teacher_email']));
                $teacher = User::where('email', $email)->first();
                if (!$teacher) {
                    $teacher = User::create([
                        'email' => $email,
                        'name' => trim($metadata['teacher_name']),
                        'role' => 'TEACHER',
                        'password' => bcrypt('password123'),
                        'is_active' => true,
                    ]);
                }

                // CourseGroup
                CourseGroup::upsert([
                    [
                        'course_group_id' => $courseGroupId,
                        'subject_code' => strtoupper(trim($metadata['subject_code'])),
                        'subject_name' => trim($metadata['subject_name']),
                        'group_code' => strtoupper(trim($metadata['group_code'])),
                        'academic_term' => trim($metadata['academic_term']),
                        'teacher_id' => $teacher->id,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]
                ], ['course_group_id'], ['subject_code', 'subject_name', 'group_code', 'academic_term', 'teacher_id', 'updated_at']);

                // Students
                $studentsData = [];
                foreach ($validRows as $item) {
                    $sKey = $item['studentKey'];
                    $studentsData[$sKey] = [
                        'student_key' => $sKey,
                        'ci' => $item['ci'],
                        'full_name' => $item['fullName'],
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                }
                Student::upsert(array_values($studentsData), ['student_key'], ['ci', 'full_name', 'updated_at']);

                // Enrollments
                $enrollmentsData = [];
                foreach ($validRows as $item) {
                    $enrollmentKey = $item['studentKey'] . ':::' . $courseGroupId;
                    $enrollmentsData[$enrollmentKey] = [
                        'student_key' => $item['studentKey'],
                        'course_group_id' => $courseGroupId,
                        'status' => 'HABILITADO',
                        'ineligibility_reason' => null,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                }
                StudentCourseEnrollment::upsert(array_values($enrollmentsData), ['student_key', 'course_group_id'], ['status', 'updated_at']);
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
            isSuccessful: $successful > 0,
            failedRows: $failedRows,
            metadata: $extractedMetadata
        );
    }

    /**
     * Processes legacy flat CSV where all metadata was repeated in each row.
     *
     * @param array<array<string|null>> $rows
     * @param array<string, int> $headerMap
     */
    private function processLegacyFlatCsv(array $rows, array $headerMap): ImportSummary
    {
        $missingColumns = $this->findMissingColumns($headerMap);

        if (!empty($missingColumns)) {
            return new ImportSummary(
                totalProcessed: 0,
                successful: 0,
                skipped: 0,
                observations: ['Missing required column headers: ' . implode(', ', $missingColumns)],
                isSuccessful: false,
                failedRows: []
            );
        }

        $totalProcessed = 0;
        $successful = 0;
        $skipped = 0;
        $observations = [];
        $failedRows = [];
        $validRows = [];
        $expectedColumnCount = count($rows[0]);

        for ($i = 1; $i < count($rows); $i++) {
            $row = $rows[$i];
            $rowNumber = $i + 1;

            if ($this->isEmptyRow($row)) {
                continue;
            }

            $totalProcessed++;

            if (count($row) !== $expectedColumnCount) {
                $skipped++;
                $reason = "Malformed row. Expected {$expectedColumnCount} columns, but found " . count($row) . ".";
                $observations[] = "Row {$rowNumber}: {$reason}";
                $failedRows[] = [
                    'rowNumber' => $rowNumber,
                    'reason' => $reason,
                    'data' => $this->extractRowData($row, $headerMap),
                ];
                continue;
            }

            $rowData = $this->extractRowData($row, $headerMap);
            $validationError = $this->validateRowData($rowData, $rowNumber);

            if ($validationError !== null) {
                $skipped++;
                $observations[] = $validationError;
                $failedRows[] = [
                    'rowNumber' => $rowNumber,
                    'reason' => $validationError,
                    'data' => $rowData,
                ];
                continue;
            }

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

        if (empty($validRows)) {
            return new ImportSummary(
                totalProcessed: $totalProcessed,
                successful: 0,
                skipped: $skipped,
                observations: $observations,
                isSuccessful: false,
                failedRows: $failedRows
            );
        }

        try {
            DB::transaction(function () use ($validRows) {
                $now = now();

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
            isSuccessful: $successful > 0,
            failedRows: $failedRows
        );
    }

    /**
     * Extracts course/teacher metadata from key-value header line.
     *
     * @param array<string|null> $row
     * @param array<string, string> $metadata
     */
    private function extractMetadataFromRow(array $row, array &$metadata): void
    {
        $firstCell = trim((string)($row[0] ?? ''));
        $secondCell = trim((string)($row[1] ?? ''));

        $key = '';
        $val = '';

        if (str_contains($firstCell, ':')) {
            $parts = explode(':', $firstCell, 2);
            $key = $parts[0];
            $val = trim($parts[1]);
            if ($val === '' && $secondCell !== '') {
                $val = $secondCell;
            }
        } elseif ($secondCell !== '' && !str_contains($firstCell, ',')) {
            $key = rtrim(trim($firstCell), ':');
            $val = $secondCell;
        }

        if ($key === '') {
            return;
        }

        $normalizedKey = strtolower(preg_replace('/[^a-z0-9]/i', '', $key));

        if (in_array($normalizedKey, ['docente', 'nombredocente', 'profesor'])) {
            $metadata['teacher_name'] = $val;
        } elseif (in_array($normalizedKey, ['emaildocente', 'email', 'correo', 'correodocente'])) {
            $metadata['teacher_email'] = $val;
        } elseif (in_array($normalizedKey, ['materia', 'asignatura', 'siglamateria'])) {
            if (str_contains($val, '-')) {
                $parts = explode('-', $val, 2);
                $metadata['subject_code'] = strtoupper(trim($parts[0]));
                $metadata['subject_name'] = trim($parts[1]);
            } else {
                $metadata['subject_code'] = strtoupper(trim($val));
                $metadata['subject_name'] ??= trim($val);
            }
        } elseif ($normalizedKey === 'sigla') {
            $metadata['subject_code'] = strtoupper(trim($val));
        } elseif ($normalizedKey === 'nombremateria') {
            $metadata['subject_name'] = trim($val);
        } elseif (in_array($normalizedKey, ['grupo', 'paralelo'])) {
            $metadata['group_code'] = strtoupper(trim($val));
        } elseif (in_array($normalizedKey, ['gestion', 'periodo'])) {
            $metadata['academic_term'] = trim($val);
        }
    }

    /**
     * Checks if any required metadata fields are missing.
     *
     * @param array<string, string> $metadata
     * @return array<string> List of missing metadata labels
     */
    private function findMissingMetadata(array $metadata): array
    {
        $missing = [];
        if (empty($metadata['teacher_name'])) {
            $missing[] = 'Docente';
        }
        if (empty($metadata['teacher_email'])) {
            $missing[] = 'Email Docente';
        }
        if (empty($metadata['subject_code'])) {
            $missing[] = 'Materia';
        }
        if (empty($metadata['group_code'])) {
            $missing[] = 'Grupo';
        }
        if (empty($metadata['academic_term'])) {
            $missing[] = 'Gestion';
        }

        return $missing;
    }

    /**
     * Checks if any required student table columns are missing.
     *
     * @param array<string, int> $headerMap
     * @return array<string> List of missing column names
     */
    private function findMissingStudentColumns(array $headerMap): array
    {
        $missing = [];
        if (!array_key_exists('codigo_sis', $headerMap)) {
            $missing[] = 'codigo_sis';
        }
        if (!array_key_exists('ci', $headerMap)) {
            $missing[] = 'ci';
        }
        if (!array_key_exists('nombre_completo', $headerMap)) {
            $missing[] = 'nombre_completo';
        }

        return $missing;
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
            isSuccessful: true,
            failedRows: []
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
