<?php

namespace App\Modules;

use App\DTOs\ProcessedRosterSummary;
use App\DTOs\RawFileData;
use App\DTOs\ImportSummary;
use App\DTOs\UserSession;
use App\DTOs\UserSummary;
use App\DTOs\CourseGroupSummary;
use App\DTOs\EnrolledStudentSummary;
use App\DTOs\ExamSummary;
use App\DTOs\ScheduleExamData;
use App\Exceptions\InvalidCredentialsException;
use App\Models\EstadoInscripcion;
use App\Models\Usuario;
use App\Models\Rol;
use App\Models\Estudiante;
use App\Models\Materia;
use App\Models\MateriaGrupo;
use App\Models\Inscripcion;
use App\Models\Examen;
use App\Models\TipoExamen;
use App\Models\Aula;
use App\Models\ExamenAula;
use App\Models\ExamenNorma;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;
use App\DTOs\UserRegistrationData;
use App\DTOs\UserUpdateData;
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
        $usuario = Usuario::where('email', strtolower(trim($email)))->first();

        if (!$usuario) {
            throw new InvalidCredentialsException('Credenciales incorrectas');
        }

        if (!Hash::check($password, $usuario->contrasena)) {
            throw new InvalidCredentialsException('Credenciales incorrectas');
        }

        if (!$usuario->activo) {
            throw new InvalidCredentialsException('Usuario inactivo o deshabilitado');
        }

        $token = JWTAuth::fromUser($usuario);
        $ttlMinutes = (int) config('jwt.ttl', 360);

        return new UserSession(
          userId: (int) $usuario->id,
            role: (string) ($usuario->roles->first()?->nombre ?? ''),
            fullName: (string) $usuario->nombre,
            email: (string) $usuario->email,
            isActive: (bool) $usuario->activo,
            token: $token,
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
        if (Usuario::where('email', $email)->exists()) {
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
                $usuario = Usuario::create([
                'nombre' => $data->fullName,
                'email' => $email,
                'contrasena' => $data->password,
                'activo' => true,
                'ci' => ''
            ]);
            
            $rolModelo = Rol::where('nombre', $role)->first();

            if ($rolModelo) {
                $usuario->roles()->attach($rolModelo->id, [
                'activo' => true,
                'fecha_asignacion' => now()
                ]);
            }

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
        $usuario = Usuario::find($userId);

       if (!$usuario) {
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
        if (Usuario::where('email', $email)->where('id', '!=', $userId)->exists()) {
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
            $usuario->nombre = $data->fullName;
            $usuario->email = $email;

            if (!empty($data->newPassword)) {
                $usuario->contrasena = bcrypt($data->newPassword);
            }

            $usuario->save();
            
            $rolModelo = Rol::where('nombre', $role)->first();

            if ($rolModelo) {
                $usuario->roles()->sync([
                $rolModelo->id => [
                'activo' => true,
                'fecha_asignacion' => now()
                    ]
                ]);
    }

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
        $usuarios = Usuario::where('activo', true)
        ->with('roles')
        ->orderBy('nombre', 'asc')
        ->get();

        return $usuarios->map(fn(Usuario $usuario) => new UserSummary(
            userId: (int) $usuario->id,
            role: (string) ($usuario->roles->first()?->nombre ?? ''),
            fullName: (string) $usuario->nombre,
            email: (string) $usuario->email,
            isActive: (bool) $usuario->activo,
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
        $courses = MateriaGrupo::where('docente_id', $teacherId)
            ->with('materia')
            ->withCount('inscripciones')
            ->orderBy('grupo', 'asc')
            ->get();

        return $courses->map(fn(MateriaGrupo $c) => new CourseGroupSummary(
            courseGroupId: (string) $c->id,
            subjectCode: (string) $c->materia->sigla,
            subjectName: (string) $c->materia->nombre,
            groupCode: (string) $c->grupo,
            academicTerm: (string) $c->gestion,
            totalEnrolled: (int) ($c->inscripciones_count ?? 0),
            teacherId: (int) $c->docente_id,
        ))->all();
    }
    
    /**
    * Retrieves all processed course rosters with the enrolled student count.
    *
    *   @return array<ProcessedRosterSummary>
    */
    public function getProcessedRosters(): array
    {
        $courses = MateriaGrupo::with([
            'docente',
            'materia'
        ])
        ->withCount('inscripciones')
        ->orderBy('grupo')
        ->get();

        return $courses->map(fn(MateriaGrupo $course) => new ProcessedRosterSummary(
            courseGroupId: (string) $course->id, 
            subjectCode: (string) $course->materia->sigla, 
            subjectName: (string) $course->materia->nombre, 
            groupCode: (string) $course->grupo, 
            academicTerm: (string) $course->gestion, 
            totalStudents: (int) ($course->inscripciones_count ?? 0), 
            teacherName: $course->docente?->nombre, 
        ))->all();
    }

    /**
     * Retrieves the list of enrolled students for a specific course group with their eligibility status.
     *
     * @param string $courseGroupId
     * @return array<EnrolledStudentSummary>
     */
    public function getEnrolledStudents(string $courseGroupId): array
    {
        $enrollments = Inscripcion::where('materia_grupo_id', $courseGroupId)
            ->with('estudiante.usuario')
            ->get();

        return $enrollments->map(function (Inscripcion $enrollment) {
            return new EnrolledStudentSummary(
                    studentKey: (string) $enrollment->estudiante->codigo_sis,
                    ci: (string) ($enrollment->estudiante?->usuario?->ci ?? ''),
                    fullName: (string) ($enrollment->estudiante?->usuario?->nombre ?? ''),
                    status: (string) ($enrollment->estado?->nombre ?? ''),
                    ineligibilityReason: $enrollment->motivo_inhabilitacion,
            );
        })->sortBy('fullName', SORT_NATURAL | SORT_FLAG_CASE)->values()->all();
    }

    /**
     * Retrieves all exams scheduled for a course group.
     *
     * @param string $courseGroupId
     * @return array<ExamSummary>
     */
    public function getCourseExams(string $courseGroupId): array
    {
        $mGroupId = $this->resolveCourseGroupId($courseGroupId);

        if (!$mGroupId) {
            return [];
        }

        $exams = Examen::where('materia_grupo_id', $mGroupId)
            ->where('activo', true)
            ->with(['tipo', 'aulas', 'normas'])
            ->orderBy('fecha', 'asc')
            ->orderBy('hora_inicio', 'asc')
            ->get();

        $now = now();
        $todayStr = $now->format('Y-m-d');
        $nowTimeStr = $now->format('H:i:s');

        return $exams->map(function (Examen $exam) use ($courseGroupId, $todayStr, $nowTimeStr) {
            $fechaStr = $exam->fecha instanceof \DateTimeInterface
                ? $exam->fecha->format('Y-m-d')
                : (string) $exam->fecha;

            $startTimeFormatted = date('H:i', strtotime($exam->hora_inicio));
            $endTimeFormatted = date('H:i', strtotime($exam->hora_fin));
            $dateDisplay = date('d/m/Y', strtotime($fechaStr));

            if ($fechaStr < $todayStr || ($fechaStr === $todayStr && $exam->hora_fin < $nowTimeStr)) {
                $status = 'Finalizado';
            } elseif ($fechaStr === $todayStr && $exam->hora_inicio <= $nowTimeStr && $exam->hora_fin >= $nowTimeStr) {
                $status = 'En curso';
            } else {
                $status = 'Próximamente';
            }

            return new ExamSummary(
                id: (int) $exam->id,
                courseGroupId: $courseGroupId,
                title: (string) ($exam->tipo?->nombre ?? 'Examen'),
                date: $dateDisplay,
                startTime: $startTimeFormatted,
                endTime: $endTimeFormatted,
                status: $status,
                classrooms: $exam->aulas->pluck('nombre')->all(),
                rules: $exam->normas->pluck('descripcion')->all()
            );
        })->all();
    }

    /**
     * Schedules a new exam for a course group.
     *
     * @param string $courseGroupId
     * @param ScheduleExamData $data
     * @return OperationResult
     */
    public function scheduleExam(string $courseGroupId, ScheduleExamData $data): OperationResult
    {
        $mGroupId = $this->resolveCourseGroupId($courseGroupId);

        if (!$mGroupId || !MateriaGrupo::where('id', $mGroupId)->exists()) {
            return new OperationResult(
                isSuccessful: false,
                message: 'El grupo de materia especificado no existe.'
            );
        }

        $parsedDate = date('Y-m-d', strtotime($data->date));
        $parsedStartTime = date('H:i:s', strtotime($data->startTime));
        $parsedEndTime = date('H:i:s', strtotime($data->endTime));

        if (!$parsedDate || $parsedDate === '1970-01-01') {
            return new OperationResult(
                isSuccessful: false,
                message: 'La fecha proporcionada no es válida.'
            );
        }

        try {
            DB::transaction(function () use ($mGroupId, $data, $parsedDate, $parsedStartTime, $parsedEndTime) {
                $tipoExamen = TipoExamen::firstOrCreate([
                    'nombre' => trim($data->title)
                ]);

                $examen = Examen::create([
                    'materia_grupo_id' => $mGroupId,
                    'tipo_examen_id' => $tipoExamen->id,
                    'fecha' => $parsedDate,
                    'hora_inicio' => $parsedStartTime,
                    'hora_fin' => $parsedEndTime,
                    'activo' => true,
                ]);

                foreach ($data->classrooms as $roomName) {
                    $cleanName = trim((string) $roomName);
                    if ($cleanName === '') {
                        continue;
                    }

                    $capacidad = str_contains(strtolower($cleanName), 'auditorio') ? 120 : 80;
                    $aula = Aula::firstOrCreate(
                        ['nombre' => $cleanName],
                        ['capacidad' => $capacidad]
                    );

                    ExamenAula::firstOrCreate([
                        'examen_id' => $examen->id,
                        'aula_id' => $aula->id,
                    ], [
                        'cupo_asignado' => $aula->capacidad ?? $capacidad,
                    ]);
                }

                foreach ($data->rules as $ruleText) {
                    $cleanRule = trim((string) $ruleText);
                    if ($cleanRule === '') {
                        continue;
                    }

                    ExamenNorma::create([
                        'examen_id' => $examen->id,
                        'descripcion' => $cleanRule,
                    ]);
                }
            });

            return new OperationResult(
                isSuccessful: true,
                message: 'Examen programado exitosamente.'
            );
        } catch (\Throwable $e) {
            return new OperationResult(
                isSuccessful: false,
                message: 'Error al programar el examen: ' . $e->getMessage()
            );
        }
    }

    /**
     * Resolves course group ID from an integer string or canonical format (e.g. 'INF110-G1-2/2026').
     */
    private function resolveCourseGroupId(string $courseGroupId): ?int
    {
        if (is_numeric($courseGroupId)) {
            return (int) $courseGroupId;
        }

        $parts = explode('-', $courseGroupId);
        if (count($parts) >= 3) {
            $sigla = $parts[0];
            $grupo = ltrim($parts[1], 'Gg');
            $gestion = implode('-', array_slice($parts, 2));

            $materia = Materia::where('sigla', strtoupper($sigla))->first();
            if ($materia) {
                $mg = MateriaGrupo::where('materia_id', $materia->id)
                    ->where('grupo', strtoupper($grupo))
                    ->where('gestion', $gestion)
                    ->first();
                if ($mg) {
                    return (int) $mg->id;
                }
            }
        }

        return null;
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

        $materiaGrupoId = MateriaGrupo::whereHas('materia', function ($query) use ($metadata) {
            $query->where('sigla', $metadata['materia.sigla']);
        })
        ->where('grupo', $metadata['grupo'])
        ->where('gestion', $metadata['gestion'])
        ->value('id');

        // Validate: if this materia_grupo already exists with a different teacher
        $teacherEmail = strtolower(trim($metadata['teacher_email']));

       $existingCourse = MateriaGrupo::whereHas('materia', function ($query) use ($metadata) {
           $query->where('sigla', $metadata['materia.sigla']);
       })
       ->where('grupo', $metadata['grupo'])
       ->where('gestion', $metadata['gestion'])
       ->with('docente')
       ->first();

        if ($existingCourse && $existingCourse->docente) {

            $existingTeacherEmail = strtolower(trim($existingCourse->docente->email));

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
            skipped: $totalProcessed,
            observations: [
                "La materia ya está asignada a otro docente."
            ],
            isSuccessful: false,
            failedRows: $failedRows,
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

                // Teacher
                $email = strtolower(trim($metadata['teacher_email']));
                $defaultPasswordHash = bcrypt('password123');
                $teacher = Usuario::where('email', $email)->first();
                if (!$teacher) {
                    $teacher = Usuario::create([
                        'nombre' => trim($metadata['teacher_name']),
                        'email' => $email,
                        'contrasena' => $defaultPasswordHash,
                        'activo' => true,
                        'ci' => ''
                    ]);

                    $rolDocente = Rol::where('nombre', 'TEACHER')->first();

                    if ($rolDocente) {
                        $teacher->roles()->attach($rolDocente->id, [
                        'activo' => true,
                        'fecha_asignacion' => now()
                        ]);
                    }
                }
                $materia = Materia::firstOrCreate(
                    [
                        'sigla' => trim($metadata['materia.sigla'])
                    ],
                    [
                        'nombre' => trim($metadata['materia.nombre']),
                        'activo' => true
                    ]
                );

                // CourseGroup
               $materiaGrupo = MateriaGrupo::updateOrCreate(
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
                $studentsData = [];
                $defaultPasswordHash = bcrypt('password123');
                foreach ($validRows as $item) {
                    $sKey = $item['studentKey'];
                    $usuarioEstudiante = Usuario::firstOrCreate(
                    [
                        'ci' => $item['ci']
                    ],
                    [
                        'nombre' => $item['fullName'],
                        'email' => $item['ci'] . '@estudiante.umss.edu.bo',
                        'contrasena' => $defaultPasswordHash,
                        'activo' => true
                    ]
                );


                    Estudiante::updateOrCreate(
                        [
                        'codigo_sis' => $sKey
                        ],
                    [
                        'usuario_id' => $usuarioEstudiante->id
                    ]
                );
                }

                // Enrollments
                $enrollmentsData = [];
                foreach ($validRows as $item) {
                    $enrollmentKey = $item['studentKey'] . ':::' . $materiaGrupo->id;
                    $enrollmentsData[$enrollmentKey] = [
                        'student_key' => $item['studentKey'],
                        'materia_grupo_id' => $materiaGrupo->id,
                        'status' => 'HABILITADO',
                        'ineligibility_reason' => null,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                }

                $estadoHabilitado = EstadoInscripcion::firstOrCreate(
                    [
                        'nombre' => 'HABILITADO'
                    ],
                    [
                        'descripcion' => 'Estudiante habilitado para rendir examen'
                    ]
                );

                foreach ($validRows as $item) {

                    $usuarioEstudiante = Usuario::where(
                        'ci',
                         $item['ci']
                    )->first();

                    if (!$usuarioEstudiante) {
                        continue;
                    }

                    Inscripcion::updateOrCreate(
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
            $materia = Materia::where(
                'sigla',
                strtoupper($cgData['sigla'])
            )->first();
            if ($materia) {
                $grupo = MateriaGrupo::where('materia_id', $materia->id)
                    ->where('grupo', $cgData['grupo'])
                    ->where('gestion', $cgData['gestion'])
                    ->with('docente')
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

                $existingTeachers = Usuario::whereIn('email', $teacherEmails)
                ->get()
                ->keyBy('email');

                foreach ($teacherEmails as $email) {
                    if (!$existingTeachers->has($email)) {
                        $defaultPasswordHash ??= bcrypt('password123');
                        $newTeacher = Usuario::create([
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

                    $materia = Materia::firstOrCreate(
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

                    MateriaGrupo::updateOrCreate(
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

                    $usuarioEstudiante = Usuario::updateOrCreate(
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


                    Estudiante::updateOrCreate(
                        [
                            'codigo_sis' => $sKey
                        ],
                        [
                            'usuario_id' => $usuarioEstudiante->id
                        ]
                    );
                }


                $estadoHabilitado = EstadoInscripcion::firstOrCreate(
                [
                    'nombre' => 'HABILITADO'
                ],
                [
                    'descripcion' => 'Estudiante habilitado para rendir examen'
                ]
            );


                foreach ($validRows as $item) {

                    $r = $item['rowData'];
                    $usuarioEstudiante = Usuario::whereHas(
                        'estudiante',
                function ($query) use ($item) {
                    $query->where(
                        'codigo_sis',
                    $item['studentKey']
                );
            }
        )->first();


    $materia = Materia::where(
        'sigla',
        strtoupper(trim($r['sigla_materia']))
    )->first();


    $materiaGrupo = MateriaGrupo::where(
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


    Inscripcion::updateOrCreate(
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
