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
use App\Models\Exam;
use App\Models\ExamRoom;
use App\Models\ExamStudent;
use App\Models\ExamRule;
use App\Models\ExamStudentStatus;
use App\Models\ExamType;
use App\Models\Room;
use App\Models\Role;
use App\Models\Student;
use App\Models\StudentCourseEnrollment;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;
use App\DTOs\UserRegistrationData;
use App\DTOs\UserRolesData;
use App\DTOs\ExamRegistrationData;
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
                    'usuario_id' => auth()->user()->id,
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
     * Registers a new exam with room assignments and rules.
     *
     * @param ExamRegistrationData $data
     * @return OperationResult
     */
    public function registerExam(ExamRegistrationData $data): OperationResult
    {
        try {
            DB::transaction(function () use ($data) {
                $now = now();

                // Validate course group exists
                $courseGroup = CourseGroup::find($data->courseGroupId);
                if (!$courseGroup) {
                    throw new \Exception("El grupo de materia con ID {$data->courseGroupId} no existe.");
                }

                // Validate exam type exists
                $examType = ExamType::find($data->examTypeId);
                if (!$examType) {
                    throw new \Exception("El tipo de examen con ID {$data->examTypeId} no existe.");
                }

                // Validate rooms exist
                $roomIds = array_column($data->rooms, 'roomId');
                $existingRooms = Room::whereIn('id', $roomIds)->count();
                if ($existingRooms !== count($roomIds)) {
                    throw new \Exception("Una o más aulas no existen.");
                }

                // Validate exam type ID
                if (empty($data->examTypeId)) {
                    throw new \Exception("El tipo de examen es requerido.");
                }

                // Calculate end time (start + 1:30h)
                $endTime = \Carbon\Carbon::parse($data->startTime)->addMinutes(90)->format('H:i');

                // Get default status: AUSENTE
                $ausenteStatus = ExamStudentStatus::where('nombre', 'AUSENTE')->first();
                if (!$ausenteStatus) {
                    throw new \Exception("El estado 'AUSENTE' no está configurado en el sistema.");
                }

                // Create exam
                $exam = Exam::create([
                    'materia_grupo_id' => $data->courseGroupId,
                    'tipo_examen_id' => $data->examTypeId,
                    'fecha' => $data->date,
                    'hora_inicio' => $data->startTime,
                    'hora_fin' => $endTime,
                    'activo' => true,
                ]);

                if (!$exam || !$exam->id) {
                    throw new \Exception("No se pudo crear el examen.");
                }

                // Validate student IDs exist in database
                $allStudentIds = [];
                foreach ($data->rooms as $room) {
                    $allStudentIds = array_merge($allStudentIds, $room->students);
                }
                $existingStudents = User::whereIn('id', array_unique($allStudentIds))->count();
                if ($existingStudents !== count(array_unique($allStudentIds))) {
                    throw new \Exception("Uno o más estudiantes no existen en la base de datos.");
                }

                // Assign rooms with students
                foreach ($data->rooms as $room) {
                    $examRoom = ExamRoom::create([
                        'examen_id' => $exam->id,
                        'aula_id' => $room->roomId,
                        'cupo_asignado' => count($room->students),
                    ]);

                    // Assign students to this room
                    foreach ($room->students as $studentId) {
                        ExamStudent::create([
                            'examen_id' => $exam->id,
                            'usuario_id' => $studentId,
                            'aula_id' => $room->roomId,
                            'estado_id' => $ausenteStatus->id,
                            'observaciones' => null,
                        ]);
                    }
                }

                // Create general rules
                foreach ($data->generalRules as $rule) {
                    ExamRule::create([
                        'examen_id' => $exam->id,
                        'descripcion' => $rule,
                    ]);
                }

                // Create student-specific rules (normas particulares)
                foreach ($data->studentRules as $studentRule) {
                    ExamStudent::where('examen_id', $exam->id)
                        ->where('usuario_id', $studentRule->studentId)
                        ->update([
                            'norma_particular' => $studentRule->rule,
                        ]);
                }

                // Audit
                $auditUserId = auth()->user()?->id;
                if ($auditUserId) {
                    DB::table('registro_auditoria')->insert([
                        'usuario_id' => $auditUserId,
                        'accion' => 'PROGRAMAR_EXAMEN',
                        'entidad_tipo' => 'examen',
                        'entidad_id' => $exam->id,
                        'detalles' => json_encode([
                            'course_group_id' => $data->courseGroupId,
                            'exam_type_id' => $data->examTypeId,
                            'date' => $data->date,
                            'start_time' => $data->startTime,
                            'end_time' => $endTime,
                            'rooms_count' => count($data->rooms),
                            'general_rules_count' => count($data->generalRules),
                            'student_rules_count' => count($data->studentRules),
                        ]),
                        'fecha' => $now,
                    ]);
                }
            });

            return new OperationResult(
                isSuccessful: true,
                message: 'Examen programado correctamente'
            );
        } catch (\Throwable $e) {
            Log::error('Error registering exam: ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine() . ' - Trace: ' . $e->getTraceAsString());
            return new OperationResult(
                isSuccessful: false,
                message: 'Error al programar el examen: ' . $e->getMessage()
            );
        }
    }

    /**
     * Retrieves all available (non-reserved) rooms for a specific date and time.
     * A room is unavailable if it has an exam that overlaps with the given time slot.
     *
     * @param string $date
     * @param string $startTime
     * @return array<RoomSummary>
     */
    public function getAvailableRooms(string $date, string $startTime): array
    {
        $endTime = \Carbon\Carbon::parse($startTime)->addMinutes(90)->format('H:i');

        // Find rooms that have exams overlapping with the requested time slot
        $reservedRoomIds = ExamRoom::whereHas('exam', function ($query) use ($date, $startTime, $endTime) {
            $query->where('fecha', $date)
                ->where('hora_inicio', '<', $endTime)
                ->where('hora_fin', '>', $startTime);
        })->pluck('aula_id');

        return Room::whereNotIn('id', $reservedRoomIds)
            ->orderBy('capacidad', 'asc')
            ->get()
            ->map(fn(Room $room) => new RoomSummary(
                roomId: (string) $room->id,
                roomName: (string) $room->nombre,
                capacity: (int) $room->capacidad,
            ))->all();
    }

    /**
     * Retrieves all active exams for a specific course group with their assigned rooms.
     *
     * @param int $courseGroupId
     * @return array<ExamSummary>
     */
    public function getExamsByCourseGroup(int $courseGroupId): array
    {
        return Exam::with(['examType', 'rooms.room'])
            ->where('materia_grupo_id', $courseGroupId)
            ->where('activo', true)
            ->orderBy('fecha', 'asc')
            ->get()
            ->map(fn(Exam $exam) => new ExamSummary(
                examId: (string) $exam->id,
                courseGroupId: (string) $exam->materia_grupo_id,
                examType: (string) ($exam->examType?->nombre ?? ''),
                date: $exam->fecha->format('Y-m-d'),
                startTime: (string) $exam->hora_inicio,
                endTime: (string) $exam->hora_fin,
                rooms: $exam->rooms->map(fn(ExamRoom $room) => new ExamRoomSummary(
                    roomId: (string) $room->aula_id,
                    roomName: (string) ($room->room?->nombre ?? ''),
                    assignedCapacity: (int) $room->cupo_asignado,
                    assistantId: $room->auxiliar_id ? (int) $room->auxiliar_id : null,
                ))->toArray(),
            ))->all();
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

    public function getProcessedRosterDetail(int $courseGroupId): ?ProcessedRosterDetail
    {
        $courseGroup = CourseGroup::with(['course', 'teacher'])
            ->where('id', $courseGroupId)
            ->first();

        if (!$courseGroup) {
            return null;
        }

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
    public function getEnrolledStudents(int $courseGroupId): array
    {
        return StudentCourseEnrollment::where('materia_grupo_id', $courseGroupId)
            ->with(['user.student', 'enrollmentStatus'])
            ->get()
            ->map(fn(StudentCourseEnrollment $enrollment) => new EnrolledStudentSummary(
                studentKey: (string) ($enrollment->user?->student?->codigo_sis ?? ''),
                ci: (string) ($enrollment->user?->ci ?? ''),
                fullName: (string) ($enrollment->user?->nombre ?? ''),
                status: (string) ($enrollment->enrollmentStatus?->nombre ?? 'HABILITADO'),
                ineligibilityReason: $enrollment->motivo_inhabilitacion,
            ))
            ->sortBy('fullName', SORT_NATURAL | SORT_FLAG_CASE)
            ->values()
            ->all();
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
        return "Docente: Juan Carlos Perez Gomez\n"
            . "Email Docente: juan.perez@umss.edu.bo\n"
            . "Materia: INF110 - INTRODUCCION A LA PROGRAMACION\n"
            . "Grupo: 1\n"
            . "Gestion: 2/2026\n\n"
            . "Codigo SIS,CI,Nombre Completo\n"
            . "202001234,7891234,Alvarez Claros Pedro\n"
            . "202005678,6543210,Benitez Lopez Carmen\n"
            . "202109876,8912345,Castro Rojas Mario\n";
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

        $materiaGrupoId = CourseGroup::whereHas('course', function ($query) use ($metadata) {
            $query->where('sigla', $metadata['materia.sigla']);
        })
        ->where('grupo', $metadata['grupo'])
        ->where('gestion', $metadata['gestion'])
        ->value('id');

        // Validate: if this materia_grupo already exists with a different teacher
        $teacherEmail = strtolower(trim($metadata['teacher_email']));

       $existingCourse = CourseGroup::whereHas('course', function ($query) use ($metadata) {
           $query->where('sigla', $metadata['materia.sigla']);
       })
       ->where('grupo', $metadata['grupo'])
       ->where('gestion', $metadata['gestion'])
       ->with('teacher')
       ->first();

        if ($existingCourse && $existingCourse->teacher) {

            $existingTeacherEmail = strtolower(trim($existingCourse->teacher->email));

            if ($existingTeacherEmail !== $teacherEmail) {

                $extractedMetadata = [
                    'teacherName' => $metadata['teacher_name'] ?? null,
                    'teacherEmail' => $metadata['teacher_email'] ?? null,
                    'subjectCode' => $metadata['materia.sigla'] ?? null,
                    'subjectName' => $metadata['materia.nombre'] ?? null,
                    'groupCode' => $metadata['grupo'] ?? null,
                    'academicTerm' => $metadata['gestion'] ?? null,
                ];

        return new ImportSummary(
            totalProcessed: 0,
            successful: 0,
            skipped: 0,
            observations: [
                "La materia {$metadata['materia.sigla']} grupo {$metadata['grupo']} ({$metadata['gestion']}) ya está asignada al docente {$existingCourse->teacher->nombre} ({$existingTeacherEmail})."
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
            ];
        }

        $extractedMetadata = [
            'teacherName' => $metadata['teacher_name'] ?? null,
            'teacherEmail' => $metadata['teacher_email'] ?? null,
            'subjectCode' => $metadata['materia.sigla'] ?? null,
            'subjectName' => $metadata['materia.nombre'] ?? null,
            'groupCode' => $metadata['grupo'] ?? null,
            'academicTerm' => $metadata['gestion'] ?? null,
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
            DB::transaction(function () use ($metadata, $validRows) {
                $now = now();

                // Teacher - must exist (pre-seeded)
                $email = strtolower(trim($metadata['teacher_email']));
                $teacher = User::where('email', $email)->first();

                if (!$teacher) {
                    throw new \Exception("El docente con email '{$email}' no está registrado en el sistema.");
                }
                // Materia - must exist (pre-seeded)
                $materia = Course::where('sigla', trim($metadata['materia.sigla']))->first();

                if (!$materia) {
                    throw new \Exception("La materia con sigla '{$metadata['materia.sigla']}' no está registrada en el sistema.");
                }

                // CourseGroup
               $materiaGrupo = CourseGroup::updateOrCreate(
                   [
                       'materia_id' => $materia->id,
                        'grupo' => trim($metadata['grupo']),
                        'gestion' => trim($metadata['gestion'])
                   ],
                   [
                       'docente_id' => $teacher->id,
                       'activo' => true
                   ]
                );

// Students
                $defaultPasswordHash = bcrypt('password123');
                $estudianteEmailId = EmailDomain::where('dominio', '@est.umss.edu')->value('id');
                $rolEstudiante = Role::where('nombre', 'ESTUDIANTE')->first();

                foreach ($validRows as $item) {
                    $sKey = $item['studentKey'];
                    $usuarioEstudiante = User::firstOrCreate(
                        [
                            'ci' => $item['ci']
                        ],
                        [
                            'nombre' => $item['fullName'],
                            'email' => $item['ci'] . '@est.umss.edu',
                            'contrasena' => $defaultPasswordHash,
                            'activo' => false,
                            'email_id' => $estudianteEmailId
                        ]
                    );

                    if ($rolEstudiante) {
                        $usuarioEstudiante->roles()->syncWithoutDetaching([$rolEstudiante->id => [
                            'activo' => true,
                            'fecha_asignacion' => now()
                        ]]);
                    }

                    Student::updateOrCreate(
                        [
                            'codigo_sis' => $sKey
                        ],
                        [
                            'usuario_id' => $usuarioEstudiante->id
                        ]
                    );
                }

                // Enrollments
                $estadoHabilitado = EnrollmentStatus::firstOrCreate(
                    [
                        'nombre' => 'HABILITADO'
                    ],
                    [
                        'descripcion' => 'Estudiante habilitado para rendir examen'
                    ]
                );

                // Cargar todos los usuarios de una sola vez (evitar N+1)
                $ciList = array_column($validRows, 'ci');
                $usuarios = User::whereIn('ci', $ciList)->get()->keyBy('ci');

                foreach ($validRows as $item) {
                    $usuarioEstudiante = $usuarios->get($item['ci']);

                    if (!$usuarioEstudiante) {
                        continue;
                    }

                    StudentCourseEnrollment::updateOrCreate(
                        [
                            'usuario_id' => $usuarioEstudiante->id,
                            'materia_grupo_id' => $materiaGrupo->id
                        ],
                        [
                            'estado_inscripcion_id' => $estadoHabilitado->id,
                            'motivo_inhabilitacion' => null,
                            'fecha_inscripcion' => now()
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
            $courseGroupId = $this->buildCourseGroupId(
                sigla: $rowData['sigla_materia'],
                grupo: $rowData['grupo'],
                gestion: $rowData['gestion']
            );

            $validRows[] = [
                'rowNumber' => $rowNumber,
                'rowData' => $rowData,
                'studentKey' => $studentKey,
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

        // Validate: check if any course_group is already assigned to a different teacher
        $courseGroupsByFile = [];
        foreach ($validRows as $item) {
            $cgKey = strtoupper(trim($item['rowData']['sigla_materia']))
                . '-'
                . trim($item['rowData']['grupo'])
                . '-'
                . trim($item['rowData']['gestion']);
            if (!isset($courseGroupsByFile[$cgKey])) {
                $courseGroupsByFile[$cgKey] = [
                'email' => strtolower(trim($item['rowData']['email_docente'])),
                'sigla' => trim($item['rowData']['sigla_materia']),
                'grupo' => trim($item['rowData']['grupo']),
                'gestion' => trim($item['rowData']['gestion']),
                 ];
            }
        }

        $existingCourseGroups = collect();
        foreach ($courseGroupsByFile as $cgData) {
            $materia = Course::where(
                'sigla',
                strtoupper($cgData['sigla'])
            )->first();
            if ($materia) {
                $grupo = CourseGroup::where('materia_id', $materia->id)
                    ->where('grupo', $cgData['grupo'])
                    ->where('gestion', $cgData['gestion'])
                    ->with('teacher')
                    ->first();
            if ($grupo) {
                $existingCourseGroups->put(
                    $cgData['sigla'] . '-' . $cgData['grupo'] . '-' . $cgData['gestion'],
                    $grupo
                );
            }
        }
    }

        $conflictObservations = [];
        foreach ($courseGroupsByFile as $cgId => $fileData) {
            $existing = $existingCourseGroups->get($cgId);
            if ($existing && $existing->teacher) {
                $existingTeacherEmail = strtolower(trim($existing->teacher->email));
                if ($existingTeacherEmail !== $fileData['email']) {
                    $conflictObservations[] = "La materia {$fileData['sigla']} grupo {$fileData['grupo']} ({$fileData['gestion']}) ya está asignada al docente {$existing->teacher->name} ({$existingTeacherEmail}). No se puede registrar con otro docente.";
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

        try {
            DB::transaction(function () use ($validRows) {
                $now = now();

                $teacherEmails = array_values(array_unique(array_map(
                    fn($item) => strtolower(trim($item['rowData']['email_docente'])),
                    $validRows
                )));

                $existingTeachers = User::whereIn('email', $teacherEmails)
                ->get()
                ->keyBy('email');

                foreach ($teacherEmails as $email) {
                    if (!$existingTeachers->has($email)) {
                        $defaultPasswordHash ??= bcrypt('password123');
                        $newTeacher = User::create([
                            'nombre' => 'Docente ' . $email,
                            'email' => $email,
                            'ci' => 'DOC-' . md5($email),
                            'contrasena' => $defaultPasswordHash,
                            'activo' => true,
                        ]);
                        $existingTeachers->put($email, $newTeacher);
                    }
                }
                
                foreach ($validRows as $item) {

                    $r = $item['rowData'];

                    $materia = Course::firstOrCreate(
                        [
                            'sigla' => strtoupper(trim($r['sigla_materia']))
                        ],
                        [
                            'nombre' => trim($r['nombre_materia']),
                            'activo' => true
                        ]
                        );

                    $teacher = $existingTeachers->get(
                        strtolower(trim($r['email_docente']))
                    );

                    CourseGroup::updateOrCreate(
                        [
                            'materia_id' => $materia->id,
                            'grupo' => strtoupper(trim($r['grupo'])),
                            'gestion' => trim($r['gestion'])
                        ],
                        [
                            'docente_id' => $teacher?->id,
                            'activo' => true
                        ]
                    );
                }

                foreach ($validRows as $item) {

                    $sKey = $item['studentKey'];
                    $r = $item['rowData'];

                    $usuarioEstudiante = User::updateOrCreate(
                        [
                            'ci' => trim($r['ci'])
                        ],
                        [
                            'nombre' => trim($r['nombre_completo']),
                            'email' => trim($r['ci']) . '@estudiante.umss.edu.bo',
                            'contrasena' => $defaultPasswordHash,
                            'activo' => true
                        ]
                    );


                    Student::updateOrCreate(
                        [
                            'codigo_sis' => $sKey
                        ],
                        [
                            'usuario_id' => $usuarioEstudiante->id
                        ]
                    );
                }


                $estadoHabilitado = EnrollmentStatus::firstOrCreate(
                [
                    'nombre' => 'HABILITADO'
                ],
                [
                    'descripcion' => 'Estudiante habilitado para rendir examen'
                ]
            );


                foreach ($validRows as $item) {

                    $r = $item['rowData'];
                    $usuarioEstudiante = User::whereHas(
                        'estudiante',
                function ($query) use ($item) {
                    $query->where(
                        'codigo_sis',
                    $item['studentKey']
                );
            }
        )->first();


    $materia = Course::where(
        'sigla',
        strtoupper(trim($r['sigla_materia']))
    )->first();


    $materiaGrupo = CourseGroup::where(
        'materia_id',
        $materia?->id
    )
    ->where(
        'grupo',
        strtoupper(trim($r['grupo']))
    )
    ->where(
        'gestion',
        trim($r['gestion'])
    )
    ->first();


    if (!$usuarioEstudiante || !$materiaGrupo) {
        continue;
    }


    StudentCourseEnrollment::updateOrCreate(
            [
                'usuario_id' => $usuarioEstudiante->id,
                'materia_grupo_id' => $materiaGrupo->id
            ],
            [
                'estado_inscripcion_id' => $estadoHabilitado->id,
                'motivo_inhabilitacion' => null,
                'fecha_inscripcion' => now()
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
                $metadata['materia.sigla'] = strtoupper(trim($parts[0]));
                $metadata['materia.nombre'] = trim($parts[1]);
            } else {
                $metadata['materia.sigla'] = strtoupper(trim($val));
                $metadata['materia.nombre'] ??= trim($val);
            }
        } elseif ($normalizedKey === 'sigla') {
            $metadata['materia.sigla'] = strtoupper(trim($val));
        } elseif ($normalizedKey === 'nombremateria') {
            $metadata['materia.nombre'] = trim($val);
        } elseif (in_array($normalizedKey, ['grupo', 'paralelo'])) {
            $metadata['grupo'] = strtoupper(trim($val));
        } elseif (in_array($normalizedKey, ['gestion', 'periodo'])) {
            $metadata['gestion'] = trim($val);
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
        if (empty($metadata['materia.sigla'])) {
            $missing[] = 'Materia';
        }
        if (empty($metadata['grupo'])) {
            $missing[] = 'Grupo';
        }
        if (empty($metadata['gestion'])) {
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

