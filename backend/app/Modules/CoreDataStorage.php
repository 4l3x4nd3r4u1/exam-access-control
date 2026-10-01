<?php

namespace App\Modules;

use App\DTOs\ProcessedRosterSummary;
use App\DTOs\RawFileData;
use App\DTOs\ImportSummary;
use App\DTOs\UserSession;
use App\DTOs\UserSummary;
use App\DTOs\CourseGroupSummary;
use App\DTOs\EnrolledStudentSummary;
use App\Exceptions\InvalidCredentialsException;
use App\Models\Course;
use App\Models\CourseGroup;
use App\Models\EmailDomain;
use App\Models\EnrollmentStatus;
use App\Models\Role;
use App\Models\Student;
use App\Models\StudentCourseEnrollment;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;
use App\DTOs\UserRegistrationData;
use App\DTOs\UserRolesData;
use App\DTOs\OperationResult;
use PhpOffice\PhpSpreadsheet\IOFactory;


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

        if (!Hash::check($password, $user->contrasena)) {
            throw new InvalidCredentialsException('Credenciales incorrectas');
        }

        if (!$user->activo) {
            throw new InvalidCredentialsException('Usuario inactivo o deshabilitado');
        }

        $token = JWTAuth::fromUser($user);
        $ttlMinutes = (int) config('jwt.ttl', 360);

        // Record session in 'sesion' table
        \App\Models\UserSession::create([
            'usuario_id' => $user->id,
            'pid' => (string) getmypid(),
            'fecha' => now(),
            'activo' => true,
        ]);

        return new UserSession(
            token: $token,
            isActive: (bool) $user->activo,
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

        $emailDomain = EmailDomain::where('activo', true)
            ->get()
            ->first(fn($d) => str_ends_with($email, $d->dominio));

        if (!$emailDomain) {
            return new OperationResult(
                isSuccessful: false,
                message: 'El correo debe pertenecer a un dominio institucional válido (@umss.edu.bo)'
            );
        }

        if (User::where('email', $email)->exists()) {
            return new OperationResult(
                isSuccessful: false,
                message: 'El correo ya está registrado'
            );
        }

        $roleNames = array_map(fn($r) => strtoupper(trim($r)), $data->roles);
        $roles = Role::whereIn('nombre', $roleNames)->get();

        if ($roles->isEmpty()) {
            return new OperationResult(
                isSuccessful: false,
                message: 'Rol no válido'
            );
        }

        try {
            DB::transaction(function () use ($data, $email, $emailDomain, $roles) {
                $user = User::create([
                    'nombre' => trim($data->fullName),
                    'email' => $email,
                    'email_id' => $emailDomain->id,
                    'contrasena' => Hash::make($data->password),
                    'ci' => $data->ci,
                    'activo' => true,
                ]);

                $roleIds = $roles->pluck('id')->toArray();
                $user->roles()->attach($roleIds, [
                    'activo' => true,
                    'fecha_asignacion' => now(),
                ]);

                DB::table('registro_auditoria')->insert([
                    'usuario_id' => $user->id,
                    'accion' => 'REGISTRAR_USUARIO',
                    'entidad_tipo' => 'usuario',
                    'entidad_id' => $user->id,
                    'detalles' => json_encode([
                        'nombre' => $data->fullName,
                        'email' => $email,
                        'ci' => $data->ci,
                        'roles_asignados' => $roles->pluck('nombre')->toArray(),
                    ]),
                    'fecha' => now(),
                ]);
            });

            return new OperationResult(
                isSuccessful: true,
                message: 'Usuario registrado correctamente'
            );

        } catch (\Illuminate\Database\UniqueConstraintViolationException $e) {
            return new OperationResult(
                isSuccessful: false,
                message: 'El correo o CI ya está registrado'
            );
        } catch (\Throwable $e) {
            return new OperationResult(
                isSuccessful: false,
                message: 'Error al registrar usuario: ' . $e->getMessage()
            );
        }
    }

    /**
     * Updates roles of a specific user. Only for admin use.
     *
     * @param int $userId
     * @param UserRolesData $data
     * @return OperationResult
     */
    public function updateUserRoles(int $userId, UserRolesData $data): OperationResult
    {
        if (auth()->id() === $userId) {
            return new OperationResult(
                isSuccessful: false,
                message: 'No puede cambiar sus propios roles'
            );
        }

        $user = User::find($userId);

        if (!$user) {
            return new OperationResult(
                isSuccessful: false,
                message: 'Usuario no encontrado'
            );
        }

        $roleNames = array_map(fn($r) => strtoupper(trim($r)), $data->roles);
        $roles = Role::whereIn('nombre', $roleNames)->get();

        if ($roles->isEmpty()) {
            return new OperationResult(
                isSuccessful: false,
                message: 'Rol no válido'
            );
        }

        try {
            DB::transaction(function () use ($user, $roles) {
                $roleIds = $roles->pluck('id')->toArray();

                $user->roles()->syncWithPivotValues($roleIds, [
                    'activo' => true,
                    'fecha_asignacion' => now(),
                ]);

                DB::table('registro_auditoria')->insert([
                    'usuario_id' => $user->id,
                    'accion' => 'MODIFICAR_ROLES',
                    'entidad_tipo' => 'usuario',
                    'entidad_id' => $user->id,
                    'detalles' => json_encode([
                        'roles_asignados' => $roles->pluck('nombre')->toArray(),
                    ]),
                    'fecha' => now(),
                ]);
            });

            return new OperationResult(
                isSuccessful: true,
                message: 'Roles actualizados correctamente'
            );
        } catch (\Throwable $e) {
            return new OperationResult(
                isSuccessful: false,
                message: 'Error al actualizar roles: ' . $e->getMessage()
            );
        }
    }

    /**
     * Updates personal data (name, CI, password) of the authenticated user.
     *
     * @param UserPersonalData $data
     * @return OperationResult
     */
    public function updatePersonalData(UserPersonalData $data): OperationResult
    {
        $user = auth()->user();

        try {
            DB::transaction(function () use ($user, $data) {
                $user->nombre = trim($data->fullName);

                if (!empty($data->ci)) {
                    $user->ci = trim($data->ci);
                }

                if (!empty($data->newPassword)) {
                    $user->contrasena = Hash::make($data->newPassword);
                }

                $user->save();

                DB::table('registro_auditoria')->insert([
                    'usuario_id' => $user->id,
                    'accion' => 'MODIFICAR_DATOS_PERSONALES',
                    'entidad_tipo' => 'usuario',
                    'entidad_id' => $user->id,
                    'detalles' => json_encode([
                        'nombre' => $data->fullName,
                        'ci' => $data->ci,
                        'cambio_password' => !empty($data->newPassword),
                    ]),
                    'fecha' => now(),
                ]);
            });

            return new OperationResult(
                isSuccessful: true,
                message: 'Datos actualizados correctamente'
            );

        } catch (\Illuminate\Database\UniqueConstraintViolationException $e) {
            return new OperationResult(
                isSuccessful: false,
                message: 'El CI ya está registrado'
            );
        } catch (\Throwable $e) {
            return new OperationResult(
                isSuccessful: false,
                message: 'Error al actualizar datos: ' . $e->getMessage()
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
        return User::with(['roles' => function ($query) {
                $query->wherePivot('activo', true);
            }])
            ->where('activo', true)
            ->whereHas('roles', function ($query) {
                $query->where('rol.nombre', '!=', 'ESTUDIANTE');
            })
            ->orderBy('nombre', 'asc')
            ->get()
            ->map(fn(User $user) => new UserSummary(
                userId: (int) $user->id,
                fullName: (string) $user->nombre,
                email: (string) $user->email,
                roles: $user->roles->pluck('nombre')->toArray(),
                isActive: (bool) $user->activo,
            ))->all();
    }

    /**
     * Retrieves all course groups assigned to a specific teacher with the enrolled student count.
     *
     * @param int $teacherId
     * @return array<CourseGroupSummary>
     */
    public function getTeacherCourses(int $teacherId, ?string $gestion = null): array
    {
        $currentUserId = auth()->id();

        $query = CourseGroup::with('course')
            ->withCount('enrollments')
            ->where('docente_id', $teacherId);

        if ($gestion !== null) {
            $query->where('gestion', $gestion);
        }

        return $query->orderBy('grupo', 'asc')
            ->get()
            ->map(fn(CourseGroup $c) => new CourseGroupSummary(
                courseGroupId: (string) $c->course_group_id,
                subjectCode: (string) ($c->course?->sigla ?? ''),
                subjectName: (string) ($c->course?->nombre ?? ''),
                groupCode: (string) $c->grupo,
                academicTerm: (string) $c->gestion,
                totalEnrolled: (int) ($c->enrollments_count ?? 0),
                teacherId: $c->docente_id,
                canInteract: $c->docente_id === $currentUserId,
            ))->all();
    }
    
    /**
    * Retrieves all processed course rosters with the enrolled student count.
    *
    *   @return array<ProcessedRosterSummary>
    */
    public function getProcessedRosters(): array
    {
        return CourseGroup::with(['course', 'teacher'])
            ->where('activo', true)
            ->orderBy('id', 'asc')
            ->get()
            ->map(fn(CourseGroup $course) => new ProcessedRosterSummary(
                courseGroupId: (string) $course->course_group_id,
                subjectCode: (string) ($course->course?->sigla ?? ''),
                subjectName: (string) ($course->course?->nombre ?? ''),
                groupCode: (string) $course->grupo,
                academicTerm: (string) $course->gestion,
                teacherName: $course->teacher?->nombre,
            ))->all();
    }

    public function getProcessedRosterDetail(int $courseGroupId): ProcessedRosterDetail
    {
        $courseGroup = CourseGroup::with(['course', 'teacher'])
            ->where('id', $courseGroupId)
            ->firstOrFail();

        $metadata = new ProcessedRosterSummary(
            courseGroupId: (string) $courseGroup->id,
            subjectCode: (string) ($courseGroup->course?->sigla ?? ''),
            subjectName: (string) ($courseGroup->course?->nombre ?? ''),
            groupCode: (string) $courseGroup->grupo,
            academicTerm: (string) $courseGroup->gestion,
            teacherName: $courseGroup->teacher?->nombre,
        );

        $students = StudentCourseEnrollment::where('materia_grupo_id', $courseGroupId)
            ->with(['user.student'])
            ->get()
            ->map(fn(StudentCourseEnrollment $e) => new EnrolledStudentSummary(
                studentKey: (string) ($e->user?->student?->codigo_sis ?? ''),
                ci: (string) ($e->user?->ci ?? ''),
                fullName: (string) ($e->user?->nombre ?? ''),
            ))
            ->values()
            ->all();

        return new ProcessedRosterDetail($metadata, $students);
    }

    /**
     * Retrieves the list of enrolled students for a specific course group with their eligibility status.
     *
     * @param int|string $courseGroupId Course group numeric ID (materia_grupo.id) or composite key
     * @return array<EnrolledStudentSummary>
     */
    public function getEnrolledStudents(int|string $courseGroupId): array
    {
        $cleanCourseGroupId = trim((string) $courseGroupId);
        $courseGroup = null;

        if (is_numeric($cleanCourseGroupId)) {
            $courseGroup = CourseGroup::find((int) $cleanCourseGroupId);
        } elseif (preg_match('/^([A-Z0-9]+)-G?([A-Z0-9]+)-(.*)$/i', $cleanCourseGroupId, $m)) {
            $courseGroup = CourseGroup::whereHas('course', fn($q) => $q->where('sigla', strtoupper($m[1])))
                ->where('grupo', strtoupper($m[2]))
                ->where('gestion', $m[3])
                ->first();
        }

        if (!$courseGroup) {
            return [];
        }

        $enrollments = StudentCourseEnrollment::where('materia_grupo_id', $courseGroup->id)
            ->with(['user.student', 'enrollmentStatus'])
            ->get();

        return $enrollments->map(function (StudentCourseEnrollment $enrollment) {
            $student = $enrollment->user?->student;
            $user = $enrollment->user;
            return new EnrolledStudentSummary(
                studentKey: (string) ($student?->codigo_sis ?? ''),
                ci: (string) ($user?->ci ?? ''),
                fullName: (string) ($user?->nombre ?? ''),
                status: (string) ($enrollment->enrollmentStatus?->nombre ?? 'HABILITADO'),
                ineligibilityReason: $enrollment->motivo_inhabilitacion,
            );
        })->sortBy('fullName', SORT_NATURAL | SORT_FLAG_CASE)->values()->all();
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

        $extractedMetadata = [
            'teacherName' => $metadata['teacher_name'] ?? null,
            'teacherEmail' => $metadata['teacher_email'] ?? null,
            'subjectCode' => $metadata['subject_code'] ?? null,
            'subjectName' => $metadata['subject_name'] ?? null,
            'groupCode' => $metadata['group_code'] ?? null,
            'academicTerm' => $metadata['academic_term'] ?? null,
        ];

        // 4. Validate Teacher exists with DOCENTE role (pre-seeded, no auto-create)
        $teacherEmail = strtolower(trim($metadata['teacher_email']));
        $teacher = User::where('email', $teacherEmail)
            ->whereHas('roles', fn($q) => $q->where('rol.nombre', 'DOCENTE'))
            ->first();

        if (!$teacher) {
            return new ImportSummary(
                totalProcessed: 0,
                successful: 0,
                skipped: 0,
                observations: ["El docente con correo '{$teacherEmail}' no está registrado en el sistema."],
                isSuccessful: false,
                failedRows: [],
                metadata: $extractedMetadata
            );
        }

        // 5. Validate Course exists (pre-seeded, no auto-create)
        $sigla = strtoupper(trim($metadata['subject_code']));
        $materia = Course::where('sigla', $sigla)->first();

        if (!$materia) {
            return new ImportSummary(
                totalProcessed: 0,
                successful: 0,
                skipped: 0,
                observations: ["La materia con sigla '{$sigla}' no está registrada en el sistema."],
                isSuccessful: false,
                failedRows: [],
                metadata: $extractedMetadata
            );
        }

        // 6. Validate CourseGroup assignment conflict
        $grupo = strtoupper(trim($metadata['group_code']));
        $gestion = trim($metadata['academic_term']);

        $existingCourse = CourseGroup::where('materia_id', $materia->id)
            ->where('grupo', $grupo)
            ->where('gestion', $gestion)
            ->with('teacher')
            ->first();

        if ($existingCourse && $existingCourse->teacher) {
            if ((int) $existingCourse->docente_id !== (int) $teacher->id) {
                $existingTeacherEmail = strtolower(trim($existingCourse->teacher->email));
                return new ImportSummary(
                    totalProcessed: 0,
                    successful: 0,
                    skipped: 0,
                    observations: [
                        "La materia {$sigla} grupo {$grupo} ({$gestion}) ya está asignada al docente {$existingCourse->teacher->nombre} ({$existingTeacherEmail}). No se puede registrar con otro docente."
                    ],
                    isSuccessful: false,
                    failedRows: [],
                    metadata: $extractedMetadata
                );
            }
        }

        $totalProcessed = 0;
        $skipped = 0;
        $observations = [];
        $failedRows = [];
        $validRows = [];

        // 7. Iterate student rows
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
            ];
        }

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

        // 8. Bulk Persistence in Database Transaction
        try {
            DB::transaction(function () use ($teacher, $materia, $grupo, $gestion, $validRows) {
                $now = now();

                // Find or create CourseGroup
                $materiaGrupo = CourseGroup::firstOrCreate(
                    [
                        'materia_id' => $materia->id,
                        'grupo' => $grupo,
                        'gestion' => $gestion,
                    ],
                    [
                        'docente_id' => $teacher->id,
                        'activo' => true,
                    ]
                );

                // Catalog lookups
                $estadoHabilitado = EnrollmentStatus::where('nombre', 'HABILITADO')->firstOrFail();
                $emailDomainEst = EmailDomain::where('dominio', '@est.umss.edu.bo')->first();
                if (!$emailDomainEst) {
                    $emailDomainEst = EmailDomain::firstOrCreate(
                        ['dominio' => '@est.umss.edu.bo'],
                        ['descripcion' => 'Estudiantes regulares UMSS', 'activo' => true]
                    );
                }
                $rolEstudiante = Role::where('nombre', 'ESTUDIANTE')->first();

                // Process each student (passive role: activo = false)
                foreach ($validRows as $item) {
                    $sis = is_numeric($item['studentKey']) ? (int)$item['studentKey'] : 0;
                    $ci = trim($item['ci']);
                    $fullName = trim($item['fullName']);

                    $estudiante = Student::where('codigo_sis', $sis)->first();
                    if ($estudiante) {
                        $user = $estudiante->user;
                        if ($user) {
                            $user->nombre = $fullName;
                            if (!empty($ci)) {
                                $user->ci = $ci;
                            }
                            $user->save();
                        }
                    } else {
                        $emailEst = "{$sis}@est.umss.edu.bo";
                        $user = User::where('email', $emailEst)
                            ->orWhere(function ($q) use ($ci) {
                                if (!empty($ci)) {
                                    $q->where('ci', $ci);
                                }
                            })->first();

                        if (!$user) {
                            $user = User::create([
                                'nombre' => $fullName,
                                'email' => $emailEst,
                                'email_id' => $emailDomainEst->id,
                                'contrasena' => Hash::make((string)$ci),
                                'activo' => false, // Rol pasivo
                                'ci' => $ci ?: null,
                            ]);

                            if ($rolEstudiante) {
                                $user->roles()->attach($rolEstudiante->id, [
                                    'activo' => true,
                                    'fecha_asignacion' => $now,
                                ]);
                            }
                        }

                        $estudiante = Student::create([
                            'codigo_sis' => $sis,
                            'usuario_id' => $user->id,
                        ]);
                    }

                    StudentCourseEnrollment::updateOrCreate(
                        [
                            'usuario_id' => $estudiante->usuario_id,
                            'materia_grupo_id' => $materiaGrupo->id,
                        ],
                        [
                            'estado_inscripcion_id' => $estadoHabilitado->id,
                            'motivo_inhabilitacion' => null,
                            'fecha_inscripcion' => $now,
                        ]
                    );
                }
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
            $siglaClean = strtoupper(trim($rowData['sigla_materia']));
            $grupoClean = strtoupper(trim($rowData['grupo']));
            $gestionClean = trim($rowData['gestion']);
            $emailDocenteClean = strtolower(trim($rowData['email_docente']));

            $validRows[] = [
                'rowNumber' => $rowNumber,
                'rowData' => $rowData,
                'studentKey' => $studentKey,
                'sigla' => $siglaClean,
                'grupo' => $grupoClean,
                'gestion' => $gestionClean,
                'emailDocente' => $emailDocenteClean,
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

        // 1. Validate distinct subjects exist in 'materia' (no auto-create)
        $distinctSiglas = array_values(array_unique(array_column($validRows, 'sigla')));
        $coursesBySigla = Course::whereIn('sigla', $distinctSiglas)->get()->keyBy('sigla');

        $missingCourses = [];
        foreach ($distinctSiglas as $sigla) {
            if (!$coursesBySigla->has($sigla)) {
                $missingCourses[] = "La materia con sigla '{$sigla}' no está registrada en el sistema.";
            }
        }

        // 2. Validate distinct teachers exist with DOCENTE role (no auto-create)
        $distinctEmails = array_values(array_unique(array_column($validRows, 'emailDocente')));
        $teachersByEmail = User::whereIn('email', $distinctEmails)
            ->whereHas('roles', fn($q) => $q->where('rol.nombre', 'DOCENTE'))
            ->get()
            ->keyBy('email');

        $missingTeachers = [];
        foreach ($distinctEmails as $email) {
            if (!$teachersByEmail->has($email)) {
                $missingTeachers[] = "El docente con correo '{$email}' no está registrado en el sistema.";
            }
        }

        $precheckErrors = array_merge($missingCourses, $missingTeachers);
        if (!empty($precheckErrors)) {
            return new ImportSummary(
                totalProcessed: $totalProcessed,
                successful: 0,
                skipped: $totalProcessed,
                observations: $precheckErrors,
                isSuccessful: false,
                failedRows: $failedRows
            );
        }

        // 3. Validate course group conflicts
        $groupCombos = [];
        foreach ($validRows as $item) {
            $key = $item['sigla'] . ':::' . $item['grupo'] . ':::' . $item['gestion'];
            if (!isset($groupCombos[$key])) {
                $groupCombos[$key] = [
                    'materia' => $coursesBySigla->get($item['sigla']),
                    'grupo' => $item['grupo'],
                    'gestion' => $item['gestion'],
                    'docente' => $teachersByEmail->get($item['emailDocente']),
                ];
            }
        }

        $conflictObservations = [];
        foreach ($groupCombos as $combo) {
            $existing = CourseGroup::where('materia_id', $combo['materia']->id)
                ->where('grupo', $combo['grupo'])
                ->where('gestion', $combo['gestion'])
                ->with('teacher')
                ->first();

            if ($existing && $existing->teacher) {
                if ((int) $existing->docente_id !== (int) $combo['docente']->id) {
                    $existingTeacherEmail = strtolower(trim($existing->teacher->email));
                    $conflictObservations[] = "La materia {$combo['materia']->sigla} grupo {$combo['grupo']} ({$combo['gestion']}) ya está asignada al docente {$existing->teacher->nombre} ({$existingTeacherEmail}). No se puede registrar con otro docente.";
                }
            }
        }

        if (!empty($conflictObservations)) {
            return new ImportSummary(
                totalProcessed: $totalProcessed,
                successful: 0,
                skipped: $totalProcessed,
                observations: $conflictObservations,
                isSuccessful: false,
                failedRows: $failedRows
            );
        }

        // 4. Persistence
        try {
            DB::transaction(function () use ($validRows, $groupCombos) {
                $now = now();

                // Create or find course groups
                $courseGroups = [];
                foreach ($groupCombos as $key => $combo) {
                    $cg = CourseGroup::firstOrCreate(
                        [
                            'materia_id' => $combo['materia']->id,
                            'grupo' => $combo['grupo'],
                            'gestion' => $combo['gestion'],
                        ],
                        [
                            'docente_id' => $combo['docente']->id,
                            'activo' => true,
                        ]
                    );
                    $courseGroups[$key] = $cg;
                }

                $estadoHabilitado = EnrollmentStatus::where('nombre', 'HABILITADO')->firstOrFail();
                $emailDomainEst = EmailDomain::where('dominio', '@est.umss.edu.bo')->first();
                if (!$emailDomainEst) {
                    $emailDomainEst = EmailDomain::firstOrCreate(
                        ['dominio' => '@est.umss.edu.bo'],
                        ['descripcion' => 'Estudiantes regulares UMSS', 'activo' => true]
                    );
                }
                $rolEstudiante = Role::where('nombre', 'ESTUDIANTE')->first();

                // Process each student (passive role)
                foreach ($validRows as $item) {
                    $sis = is_numeric($item['studentKey']) ? (int)$item['studentKey'] : 0;
                    $r = $item['rowData'];
                    $ci = trim($r['ci']);
                    $fullName = trim($r['nombre_completo']);
                    $groupKey = $item['sigla'] . ':::' . $item['grupo'] . ':::' . $item['gestion'];
                    $courseGroup = $courseGroups[$groupKey];

                    $estudiante = Student::where('codigo_sis', $sis)->first();
                    if ($estudiante) {
                        $user = $estudiante->user;
                        if ($user) {
                            $user->nombre = $fullName;
                            if (!empty($ci)) {
                                $user->ci = $ci;
                            }
                            $user->save();
                        }
                    } else {
                        $emailEst = "{$sis}@est.umss.edu.bo";
                        $user = User::where('email', $emailEst)
                            ->orWhere(function ($q) use ($ci) {
                                if (!empty($ci)) {
                                    $q->where('ci', $ci);
                                }
                            })->first();

                        if (!$user) {
                            $user = User::create([
                                'nombre' => $fullName,
                                'email' => $emailEst,
                                'email_id' => $emailDomainEst->id,
                                'contrasena' => Hash::make((string)$ci),
                                'activo' => false,
                                'ci' => $ci ?: null,
                            ]);

                            if ($rolEstudiante) {
                                $user->roles()->attach($rolEstudiante->id, [
                                    'activo' => true,
                                    'fecha_asignacion' => $now,
                                ]);
                            }
                        }

                        $estudiante = Student::create([
                            'codigo_sis' => $sis,
                            'usuario_id' => $user->id,
                        ]);
                    }

                    StudentCourseEnrollment::updateOrCreate(
                        [
                            'usuario_id' => $estudiante->usuario_id,
                            'materia_grupo_id' => $courseGroup->id,
                        ],
                        [
                            'estado_inscripcion_id' => $estadoHabilitado->id,
                            'motivo_inhabilitacion' => null,
                            'fecha_inscripcion' => $now,
                        ]
                    );
                }
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
        $extension = strtolower(trim($fileData->extension, '. '));
        $readerType = $extension === 'xls' ? 'Xls' : 'Xlsx';
        $temporaryPath = tempnam(sys_get_temp_dir(), 'student-roster-');

        if ($temporaryPath === false) {
            return new ImportSummary(
                totalProcessed: 0,
                successful: 0,
                skipped: 0,
                observations: ['No se pudo preparar el archivo Excel para su lectura.'],
                isSuccessful: false,
                failedRows: []
            );
        }

        try {
            file_put_contents($temporaryPath, $fileData->content);

            $reader = IOFactory::createReader($readerType);
            $reader->setReadDataOnly(true);
            $spreadsheet = $reader->load($temporaryPath);
            $rows = $spreadsheet->getActiveSheet()->toArray(null, true, true, false);
            $spreadsheet->disconnectWorksheets();

            // Se convierte la hoja a CSV en memoria para reutilizar exactamente
            // la misma detección de metadatos, validación y persistencia del CSV.
            $stream = fopen('php://memory', 'r+');
            foreach ($rows as $row) {
                fputcsv($stream, $row);
            }
            rewind($stream);
            $csvContent = stream_get_contents($stream);
            fclose($stream);

            return $this->processCsv(new RawFileData(
                content: $csvContent,
                fileName: $fileData->fileName . '.csv',
                extension: 'csv'
            ));
        } catch (\Throwable $exception) {
            return new ImportSummary(
                totalProcessed: 0,
                successful: 0,
                skipped: 0,
                observations: ['No se pudo leer el archivo Excel. Verifique que no esté dañado y vuelva a intentarlo.'],
                isSuccessful: false,
                failedRows: []
            );
        } finally {
            @unlink($temporaryPath);
        }
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
            return "Falta codigo sis del estudiante (codigo_sis).";
        }

        if (empty($rowData['ci'])) {
            return "Falta carnet CI del estudiante (ci).";
        }

        if (empty($rowData['nombre_completo'])) {
            return "Falta nombre del estudiante (nombre_completo).";
        }

        if (empty($rowData['sigla_materia'])) {
            return "Falta sigla de la materia (sigla_materia).";
        }

        if (empty($rowData['grupo'])) {
            return "Falta grupo de la materia (grupo).";
        }

        if (empty($rowData['gestion'])) {
            return "Falta gestion (gestion).";
        }

        if (empty($rowData['email_docente'])) {
            return "Falta correo del docente (email_docente).";
        }

        return null;
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
