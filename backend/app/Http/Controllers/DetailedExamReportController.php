<?php

namespace App\Http\Controllers;

use App\Models\Exam;
use App\Models\ExamInvitation;
use App\Models\ExamRoom;
use App\Models\Room;
use App\Models\Student;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class DetailedExamReportController extends Controller
{
    private const TIMEZONE = 'America/La_Paz';
    private const REPORT_ACTION = 'GENERAR_REPORTE_DETALLADO_EXAMEN';

    /**
     * Lista los exámenes activos que ya finalizaron y a los que el usuario tiene acceso.
     */
    public function finishedExams(Request $request): JsonResponse
    {
        $user = auth()->user();

        if (!$user instanceof User || !$this->userCanUseModule($user)) {
            return response()->json([
                'success' => false,
                'message' => 'No tiene autorización para consultar reportes detallados de exámenes.',
            ], 403);
        }

        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:150'],
            'exam_type' => ['nullable', 'string', 'max:60'],
            'gestion' => ['nullable', 'string', 'max:50'],
        ]);

        $exams = Exam::with([
            'courseGroup.course',
            'courseGroup.teacher',
            'examType',
            'examRooms.room',
            'examRooms.assistant',
            'invitations',
        ])
            ->where('activo', true)
            ->orderByDesc('fecha')
            ->orderByDesc('hora_fin')
            ->get()
            ->filter(fn(Exam $exam) => $this->isExamFinished($exam) && $this->userCanAccessExam($user, $exam))
            ->values();

        $examTypes = $exams
            ->map(fn(Exam $exam) => strtoupper(trim((string) ($exam->examType?->nombre ?? ''))))
            ->filter()
            ->unique()
            ->sort()
            ->values()
            ->all();

        $gestiones = $exams
            ->map(fn(Exam $exam) => trim((string) ($exam->courseGroup?->gestion ?? '')))
            ->filter()
            ->unique()
            ->sort()
            ->reverse()
            ->values()
            ->all();

        $search = trim((string) ($validated['search'] ?? ''));
        $examTypeFilter = strtoupper(trim((string) ($validated['exam_type'] ?? '')));
        $gestionFilter = trim((string) ($validated['gestion'] ?? ''));

        $filtered = $exams->filter(function (Exam $exam) use ($search, $examTypeFilter, $gestionFilter) {
            $type = strtoupper(trim((string) ($exam->examType?->nombre ?? '')));
            if ($examTypeFilter !== '' && $type !== $examTypeFilter) {
                return false;
            }

            $gestion = trim((string) ($exam->courseGroup?->gestion ?? ''));
            if ($gestionFilter !== '' && $gestion !== $gestionFilter) {
                return false;
            }

            if ($search !== '') {
                $haystack = Str::lower(Str::ascii(implode(' ', [
                    $exam->courseGroup?->course?->nombre ?? '',
                    $exam->courseGroup?->course?->sigla ?? '',
                    'G' . ($exam->courseGroup?->grupo ?? ''),
                    $exam->courseGroup?->grupo ?? '',
                    $gestion,
                    $type,
                ])));
                $needle = Str::lower(Str::ascii($search));
                if (!str_contains($haystack, $needle)) {
                    return false;
                }
            }

            return true;
        })->values();

        $data = $filtered->map(fn(Exam $exam) => $this->formatExamHeader($exam))->all();

        return response()->json([
            'success' => true,
            'data' => $data,
            'meta' => [
                'exam_types' => $examTypes,
                'gestiones' => $gestiones,
            ],
            'message' => 'Exámenes finalizados obtenidos correctamente.',
        ], 200);
    }

    /**
     * Obtiene el resumen detallado de todo lo registrado en un examen finalizado.
     */
    public function show(int $examId): JsonResponse
    {
        $exam = $this->loadExamForReport($examId);

        if (!$exam) {
            return response()->json([
                'success' => false,
                'message' => 'El examen no existe.',
            ], 404);
        }

        $user = auth()->user();
        if (!$user instanceof User || !$this->userCanAccessExam($user, $exam)) {
            return response()->json([
                'success' => false,
                'message' => 'No tiene autorización para consultar el reporte de este examen.',
            ], 403);
        }

        if (!$this->isExamFinished($exam)) {
            return response()->json([
                'success' => false,
                'message' => 'Solo se puede generar un reporte detallado cuando el examen ha finalizado.',
            ], 422);
        }

        $payload = $this->buildExamReportPayload($exam);

        return response()->json([
            'success' => true,
            'data' => [
                'exam' => $payload['exam'],
                'summary' => $payload['summary'],
                'events' => $payload['events'],
                'roster' => $payload['roster'],
                'generated_reports' => $this->getGeneratedReportsHistory($exam->id),
            ],
            'message' => 'Detalle de registros del examen obtenido correctamente.',
        ], 200);
    }

    /**
     * Genera y guarda un snapshot del reporte detallado completo del examen.
     */
    public function generate(int $examId): JsonResponse
    {
        $exam = $this->loadExamForReport($examId);

        if (!$exam) {
            return response()->json([
                'success' => false,
                'message' => 'El examen no existe.',
            ], 404);
        }

        $user = auth()->user();
        if (!$user instanceof User || !$this->userCanAccessExam($user, $exam)) {
            return response()->json([
                'success' => false,
                'message' => 'No tiene autorización para generar reportes de este examen.',
            ], 403);
        }

        if (!$this->isExamFinished($exam)) {
            return response()->json([
                'success' => false,
                'message' => 'Solo se puede generar un reporte detallado cuando el examen ha finalizado.',
            ], 422);
        }

        $payload = $this->buildExamReportPayload($exam);
        $now = now();
        $fileName = $this->buildReportFileName($exam);

        $snapshot = [
            'file_name' => $fileName,
            'generated_at' => $now->toIso8601String(),
            'generated_by' => $user->nombre,
            'exam' => $payload['exam'],
            'summary' => $payload['summary'],
            'events' => $payload['events'],
            'roster' => $payload['roster'],
            'included_sections' => $this->buildIncludedSections($payload['exam'], $payload['summary']),
        ];

        $reportId = DB::table('registro_auditoria')->insertGetId([
            'usuario_id' => $user->id,
            'accion' => self::REPORT_ACTION,
            'entidad_tipo' => 'examen',
            'entidad_id' => $exam->id,
            'detalles' => json_encode($snapshot, JSON_UNESCAPED_UNICODE),
            'fecha' => $now,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $history = $this->getGeneratedReportsHistory($exam->id);
        $createdReport = collect($history)->firstWhere('id', $reportId) ?? [
            'id' => $reportId,
            'file_name' => $fileName,
            'generated_at' => $now->toIso8601String(),
            'generated_by' => $user->nombre,
            'summary' => $payload['summary'],
            'included_sections' => $snapshot['included_sections'],
        ];

        return response()->json([
            'success' => true,
            'data' => [
                'report' => $createdReport,
                'generated_reports' => $history,
            ],
            'message' => 'Reporte detallado generado correctamente.',
        ], 201);
    }

    /**
     * Descarga en formato PDF un reporte detallado generado previamente.
     */
    public function downloadPdf(int $examId, int $reportId)
    {
        $exam = $this->loadExamForReport($examId);

        if (!$exam) {
            return response()->json([
                'success' => false,
                'message' => 'El examen no existe.',
            ], 404);
        }

        $user = auth()->user();
        if (!$user instanceof User || !$this->userCanAccessExam($user, $exam)) {
            return response()->json([
                'success' => false,
                'message' => 'No tiene autorización para descargar este reporte.',
            ], 403);
        }

        $report = DB::table('registro_auditoria')
            ->where('id', $reportId)
            ->where('accion', self::REPORT_ACTION)
            ->where('entidad_tipo', 'examen')
            ->where('entidad_id', $examId)
            ->first();

        if (!$report) {
            return response()->json([
                'success' => false,
                'message' => 'El reporte detallado no existe.',
            ], 404);
        }

        $details = $this->decodeDetails($report->detalles);
        $fallbackPayload = empty($details['summary']) || empty($details['exam'])
            ? $this->buildExamReportPayload($exam)
            : null;

        $examInfo = $details['exam'] ?? $fallbackPayload['exam'];
        $summary = $details['summary'] ?? $fallbackPayload['summary'];
        $events = $details['events'] ?? ($fallbackPayload['events'] ?? []);
        $roster = $details['roster'] ?? ($fallbackPayload['roster'] ?? []);
        $generatedBy = $details['generated_by']
            ?? DB::table('usuario')->where('id', $report->usuario_id)->value('nombre')
            ?? 'Sistema';
        $generatedAt = $details['generated_at'] ?? (string) $report->fecha;
        $fileName = $details['file_name'] ?? $this->buildReportFileName($exam);

        $pdf = Pdf::loadView('reports.detailed-exam-report', [
            'exam' => $examInfo,
            'summary' => $summary,
            'events' => $events,
            'roster' => $roster,
            'generatedBy' => $generatedBy,
            'generatedAt' => $generatedAt,
            'reportId' => $reportId,
        ]);

        return $pdf->download($fileName);
    }

    private function loadExamForReport(int $examId): ?Exam
    {
        return Exam::with([
            'courseGroup.course',
            'courseGroup.teacher',
            'examType',
            'rules',
            'examRooms.room',
            'examRooms.assistant',
            'examStudents.user',
            'examStudents.student',
            'examStudents.room',
            'examStudents.status',
            'invitations',
        ])->find($examId);
    }

    private function userCanUseModule(User $user): bool
    {
        return $user->hasRole('ADMIN')
            || $user->hasRole('DOCENTE')
            || $user->hasFunction('GESTIONAR_PUNTOS_CONTROL_EXAMEN')
            || $user->hasFunction('LISTAR_EXAMENES_MATERIA');
    }

    private function userCanAccessExam(User $user, Exam $exam): bool
    {
        if (!$this->userCanUseModule($user)) {
            return false;
        }

        if ($user->hasRole('ADMIN')) {
            return true;
        }

        $userId = (int) $user->id;
        if ((int) ($exam->courseGroup?->docente_id ?? 0) === $userId) {
            return true;
        }

        $isAssignedAssistant = $exam->relationLoaded('examRooms')
            ? $exam->examRooms->contains(fn(ExamRoom $room) => (int) ($room->auxiliar_id ?? 0) === $userId)
            : ExamRoom::where('examen_id', $exam->id)->where('auxiliar_id', $userId)->exists();

        if ($isAssignedAssistant) {
            return true;
        }

        return $exam->relationLoaded('invitations')
            ? $exam->invitations->contains(fn(ExamInvitation $inv) => (int) $inv->docente_invitado_id === $userId)
            : ExamInvitation::where('examen_id', $exam->id)->where('docente_invitado_id', $userId)->exists();
    }

    private function isExamFinished(Exam $exam): bool
    {
        if (!$exam->fecha || !$exam->hora_fin) {
            return false;
        }

        $end = CarbonImmutable::parse(
            $exam->fecha->format('Y-m-d') . ' ' . $exam->hora_fin,
            self::TIMEZONE
        );

        return $end->lessThan(CarbonImmutable::now(self::TIMEZONE));
    }

    private function formatExamHeader(Exam $exam): array
    {
        $rooms = $exam->examRooms->map(function (ExamRoom $examRoom) {
            return [
                'room_id' => (string) $examRoom->aula_id,
                'room_name' => (string) ($examRoom->room?->nombre ?? ''),
                'assigned_capacity' => (int) ($examRoom->cupo_asignado ?? 0),
                'assistant_id' => $examRoom->auxiliar_id !== null ? (int) $examRoom->auxiliar_id : null,
                'assistant_name' => $examRoom->assistant?->nombre,
            ];
        })->values()->all();

        return [
            'exam_id' => (string) $exam->id,
            'course_group_id' => (string) $exam->materia_grupo_id,
            'subject_name' => (string) ($exam->courseGroup?->course?->nombre ?? ''),
            'subject_code' => (string) ($exam->courseGroup?->course?->sigla ?? ''),
            'group' => (string) ($exam->courseGroup?->grupo ?? ''),
            'academic_term' => (string) ($exam->courseGroup?->gestion ?? ''),
            'teacher_name' => (string) ($exam->courseGroup?->teacher?->nombre ?? ''),
            'exam_type' => (string) ($exam->examType?->nombre ?? ''),
            'date' => $exam->fecha?->format('Y-m-d') ?? '',
            'start_time' => (string) $exam->hora_inicio,
            'end_time' => (string) $exam->hora_fin,
            'status' => 'FINALIZADO',
            'rooms' => $rooms,
            'general_rules' => $exam->relationLoaded('rules')
                ? $exam->rules->pluck('descripcion')->values()->all()
                : [],
        ];
    }

    private function buildExamReportPayload(Exam $exam): array
    {
        $examHeader = $this->formatExamHeader($exam);
        $examStudents = $exam->examStudents;

        $accessRecords = DB::table('registro_acceso_examen')
            ->where('exam_id', $exam->id)
            ->orderByDesc('fecha')
            ->orderByDesc('hora')
            ->orderByDesc('id')
            ->get();

        $userIds = $accessRecords->pluck('user_id_estudiante')
            ->concat($accessRecords->pluck('user_id_operador'))
            ->filter()
            ->unique()
            ->values();

        $users = $userIds->isNotEmpty()
            ? User::whereIn('id', $userIds)->pluck('nombre', 'id')
            : collect();

        $sisByUserId = $userIds->isNotEmpty()
            ? Student::whereIn('usuario_id', $userIds)->pluck('codigo_sis', 'usuario_id')
            : collect();

        $roomIds = $accessRecords->pluck('aula_id')->filter()->unique()->values();
        $roomsById = $roomIds->isNotEmpty()
            ? Room::whereIn('id', $roomIds)->pluck('nombre', 'id')
            : collect();

        $events = collect();
        $coveredExpulsions = [];
        $coveredExceptions = [];
        $coveredPermitted = [];

        foreach ($accessRecords as $rec) {
            $studentId = (int) $rec->user_id_estudiante;
            $studentName = (string) ($users->get($studentId) ?? 'Estudiante');
            $studentSis = (string) ($sisByUserId->get($studentId) ?? '');
            $operatorName = (string) ($users->get((int) $rec->user_id_operador) ?? 'Operador');
            $roomName = (string) ($roomsById->get((int) $rec->aula_id) ?? 'Sin aula');
            $timeShort = $rec->hora ? substr((string) $rec->hora, 0, 5) : '';
            $timestamp = ($rec->fecha && $rec->hora)
                ? "{$rec->fecha} {$rec->hora}"
                : (string) ($rec->created_at ?? '');

            $actorTitle = $studentSis !== '' ? "{$studentName} · {$studentSis}" : $studentName;
            $subtitle = trim($roomName . ($timeShort !== '' ? " · {$timeShort}" : ''));

            if ($rec->resultado === 'EXPULSION') {
                $coveredExpulsions[$studentId] = true;
                $events->push([
                    'id' => "acc-{$rec->id}",
                    'type' => 'EXPULSION',
                    'category' => 'EXPULSION',
                    'title' => $actorTitle,
                    'subtitle' => $subtitle,
                    'room_name' => $roomName,
                    'time' => $timeShort,
                    'timestamp' => $timestamp,
                    'actor_name' => $operatorName,
                    'student_name' => $studentName,
                    'student_sis' => $studentSis,
                    'detail' => $rec->observacion ?: 'Expulsión registrada durante el examen.',
                ]);
            } elseif ($rec->resultado === 'EXCEPCION') {
                $coveredExceptions[$studentId] = true;
                $events->push([
                    'id' => "acc-{$rec->id}",
                    'type' => 'AUTORIZACION',
                    'category' => 'OBSERVACION',
                    'title' => $actorTitle,
                    'subtitle' => $subtitle,
                    'room_name' => $roomName,
                    'time' => $timeShort,
                    'timestamp' => $timestamp,
                    'actor_name' => $operatorName,
                    'student_name' => $studentName,
                    'student_sis' => $studentSis,
                    'detail' => $rec->observacion ?: 'Estudiante inhabilitado ingresa bajo autorización.',
                ]);
            } elseif ($rec->resultado === 'PERMITIDO') {
                $coveredPermitted[$studentId] = true;
                $events->push([
                    'id' => "acc-{$rec->id}",
                    'type' => 'INGRESO',
                    'category' => 'INGRESO',
                    'title' => $actorTitle,
                    'subtitle' => $subtitle,
                    'room_name' => $roomName,
                    'time' => $timeShort,
                    'timestamp' => $timestamp,
                    'actor_name' => $operatorName,
                    'student_name' => $studentName,
                    'student_sis' => $studentSis,
                    'detail' => "Ingreso habilitado registrado por {$operatorName}.",
                ]);
            }
        }

        // Audit log events for this exam (observations, incident reports, time extensions)
        $auditRows = DB::table('registro_auditoria')
            ->whereIn('accion', [
                'REGISTRAR_INFORMACION_RELATIVA',
                'GENERAR_REPORTE_EXAMEN',
                'EXTEND_EXAM_TIME',
            ])
            ->orderByDesc('fecha')
            ->orderByDesc('id')
            ->get();

        $auditUserIds = $auditRows->pluck('usuario_id')->filter()->unique()->values();
        $auditUsers = $auditUserIds->isNotEmpty()
            ? User::whereIn('id', $auditUserIds)->pluck('nombre', 'id')
            : collect();

        $coveredObservations = [];

        foreach ($auditRows as $row) {
            $details = $this->decodeDetails($row->detalles);
            $matchesExam = $row->entidad_tipo === 'examen'
                ? (int) $row->entidad_id === (int) $exam->id
                : (int) ($details['examen_id'] ?? 0) === (int) $exam->id;

            if (!$matchesExam) {
                continue;
            }

            $actorName = (string) ($details['responsable'] ?? $details['docente'] ?? $auditUsers->get((int) $row->usuario_id) ?? 'Usuario');
            $timestamp = (string) ($details['fecha_hora'] ?? $details['fecha_operacion'] ?? $row->fecha ?? '');
            $timeShort = $this->extractTimeFromTimestamp($timestamp);

            if ($row->accion === 'REGISTRAR_INFORMACION_RELATIVA') {
                $studentId = (int) ($details['estudiante_id'] ?? $row->entidad_id ?? 0);
                $coveredObservations[$studentId] = true;
                $studentName = (string) ($details['nombre_estudiante'] ?? 'Estudiante');
                $studentSis = (string) ($details['codigo_sis'] ?? '');
                $roomName = (string) ($details['aula'] ?? 'Sin aula');

                $events->push([
                    'id' => "aud-{$row->id}",
                    'type' => 'OBSERVACION',
                    'category' => 'OBSERVACION',
                    'title' => $studentSis !== '' ? "{$studentName} · {$studentSis}" : $studentName,
                    'subtitle' => trim($roomName . ($timeShort !== '' ? " · {$timeShort}" : '')),
                    'room_name' => $roomName,
                    'time' => $timeShort,
                    'timestamp' => $timestamp,
                    'actor_name' => $actorName,
                    'student_name' => $studentName,
                    'student_sis' => $studentSis,
                    'detail' => (string) ($details['descripcion'] ?? 'Observación registrada.'),
                ]);
            } elseif ($row->accion === 'GENERAR_REPORTE_EXAMEN') {
                $events->push([
                    'id' => "aud-{$row->id}",
                    'type' => 'INCIDENTE',
                    'category' => 'INCIDENTE',
                    'title' => "{$actorName} (Responsable)",
                    'subtitle' => $timeShort !== '' ? "Incidencia · {$timeShort}" : 'Incidencia registrada',
                    'room_name' => 'General',
                    'time' => $timeShort,
                    'timestamp' => $timestamp,
                    'actor_name' => $actorName,
                    'student_name' => null,
                    'student_sis' => null,
                    'detail' => (string) ($details['descripcion'] ?? 'Reporte de incidencia.'),
                ]);
            } elseif ($row->accion === 'EXTEND_EXAM_TIME') {
                $prev = substr((string) ($details['hora_fin_anterior'] ?? ''), 0, 5);
                $next = substr((string) ($details['hora_fin_nueva'] ?? ''), 0, 5);
                $mins = (int) ($details['minutos_agregados'] ?? 15);
                $events->push([
                    'id' => "aud-{$row->id}",
                    'type' => 'INCIDENTE',
                    'category' => 'INCIDENTE',
                    'title' => "{$actorName} (Responsable)",
                    'subtitle' => $timeShort !== '' ? "Ampliación · {$timeShort}" : 'Ampliación de horario',
                    'room_name' => 'General',
                    'time' => $timeShort,
                    'timestamp' => $timestamp,
                    'actor_name' => $actorName,
                    'student_name' => null,
                    'student_sis' => null,
                    'detail' => "Ampliación de tiempo (+{$mins} min): {$prev} a {$next}.",
                ]);
            }
        }

        // Fallbacks from examen_estudiante if any state/observation exists without access/audit log row
        foreach ($examStudents as $es) {
            $studentId = (int) $es->usuario_id;
            $statusName = strtoupper((string) ($es->status?->nombre ?? ''));
            $studentName = (string) ($es->user?->nombre ?? 'Estudiante');
            $studentSis = (string) ($es->student?->codigo_sis ?? '');
            $roomName = (string) ($es->room?->nombre ?? 'Sin aula');
            $actorTitle = $studentSis !== '' ? "{$studentName} · {$studentSis}" : $studentName;
            $checkIn = $es->hora_ingreso ? $es->hora_ingreso->format('Y-m-d H:i:s') : (string) ($es->updated_at ?? '');
            $timeShort = $this->extractTimeFromTimestamp($checkIn);
            $subtitle = trim($roomName . ($timeShort !== '' ? " · {$timeShort}" : ''));

            if ($statusName === 'EXPULSADO' && !isset($coveredExpulsions[$studentId])) {
                $events->push([
                    'id' => "es-exp-{$studentId}",
                    'type' => 'EXPULSION',
                    'category' => 'EXPULSION',
                    'title' => $actorTitle,
                    'subtitle' => $subtitle,
                    'room_name' => $roomName,
                    'time' => $timeShort,
                    'timestamp' => $checkIn,
                    'actor_name' => $examHeader['teacher_name'] ?: 'Responsable',
                    'student_name' => $studentName,
                    'student_sis' => $studentSis,
                    'detail' => $es->motivo_expulsion ?: 'Expulsión registrada.',
                ]);
            }

            if ($statusName === 'INGRESO EXCEPCIONAL' && !isset($coveredExceptions[$studentId])) {
                $events->push([
                    'id' => "es-exc-{$studentId}",
                    'type' => 'AUTORIZACION',
                    'category' => 'OBSERVACION',
                    'title' => $actorTitle,
                    'subtitle' => $subtitle,
                    'room_name' => $roomName,
                    'time' => $timeShort,
                    'timestamp' => $checkIn,
                    'actor_name' => $examHeader['teacher_name'] ?: 'Responsable',
                    'student_name' => $studentName,
                    'student_sis' => $studentSis,
                    'detail' => $es->observaciones ?: 'Ingreso excepcional autorizado.',
                ]);
            }

            if (
                $es->observaciones !== null
                && trim($es->observaciones) !== ''
                && $statusName !== 'INGRESO EXCEPCIONAL'
                && !isset($coveredObservations[$studentId])
            ) {
                $obsTs = (string) ($es->updated_at ?? $es->created_at ?? '');
                $obsTime = $this->extractTimeFromTimestamp($obsTs);
                $events->push([
                    'id' => "es-obs-{$studentId}",
                    'type' => 'OBSERVACION',
                    'category' => 'OBSERVACION',
                    'title' => $actorTitle,
                    'subtitle' => trim($roomName . ($obsTime !== '' ? " · {$obsTime}" : '')),
                    'room_name' => $roomName,
                    'time' => $obsTime,
                    'timestamp' => $obsTs,
                    'actor_name' => $examHeader['teacher_name'] ?: 'Responsable',
                    'student_name' => $studentName,
                    'student_sis' => $studentSis,
                    'detail' => trim($es->observaciones),
                ]);
            }

            if ($statusName === 'PRESENTE' && !isset($coveredPermitted[$studentId])) {
                $events->push([
                    'id' => "es-ing-{$studentId}",
                    'type' => 'INGRESO',
                    'category' => 'INGRESO',
                    'title' => $actorTitle,
                    'subtitle' => $subtitle,
                    'room_name' => $roomName,
                    'time' => $timeShort,
                    'timestamp' => $checkIn,
                    'actor_name' => $examHeader['teacher_name'] ?: 'Operador',
                    'student_name' => $studentName,
                    'student_sis' => $studentSis,
                    'detail' => 'Ingreso registrado en punto de control.',
                ]);
            }
        }

        $sortedEvents = $events
            ->sortByDesc('timestamp')
            ->values()
            ->all();

        $roster = $examStudents->map(function ($es) {
            return [
                'user_id' => (int) $es->usuario_id,
                'nombre' => (string) ($es->user?->nombre ?? 'Estudiante'),
                'codigo_sis' => (string) ($es->student?->codigo_sis ?? ''),
                'ci' => (string) ($es->user?->ci ?? ''),
                'aula' => (string) ($es->room?->nombre ?? 'Sin aula'),
                'estado' => (string) ($es->status?->nombre ?? 'AUSENTE'),
                'hora_ingreso' => $es->hora_ingreso ? $es->hora_ingreso->format('H:i') : null,
                'observaciones' => $es->observaciones,
                'motivo_expulsion' => $es->motivo_expulsion,
            ];
        })->sortBy('nombre')->values()->all();

        $totalAssigned = $examStudents->count();
        $totalEntered = $examStudents->filter(function ($es) {
            $status = strtoupper((string) ($es->status?->nombre ?? ''));
            return $es->hora_ingreso !== null
                || in_array($status, ['PRESENTE', 'INGRESO EXCEPCIONAL', 'EXPULSADO'], true);
        })->count();
        $totalPresent = $examStudents->filter(
            fn($es) => strtoupper((string) ($es->status?->nombre ?? '')) === 'PRESENTE'
        )->count();

        $eventCollection = collect($sortedEvents);
        $totalExpulsions = $eventCollection->where('type', 'EXPULSION')->count();
        $totalExceptional = $eventCollection->where('type', 'AUTORIZACION')->count();
        $totalObservations = $eventCollection->where('category', 'OBSERVACION')->count();
        $totalIncidents = $eventCollection->where('category', 'INCIDENTE')->count();

        return [
            'exam' => $examHeader,
            'summary' => [
                'total_assigned' => $totalAssigned,
                'total_entered' => $totalEntered,
                'total_absent' => max(0, $totalAssigned - $totalEntered),
                'total_present' => $totalPresent,
                'total_exceptional' => $totalExceptional,
                'total_observations' => $totalObservations,
                'total_expulsions' => $totalExpulsions,
                'total_incidents' => $totalIncidents,
                'total_events' => count($sortedEvents),
            ],
            'events' => $sortedEvents,
            'roster' => $roster,
        ];
    }

    private function getGeneratedReportsHistory(int $examId): array
    {
        $rows = DB::table('registro_auditoria')
            ->where('accion', self::REPORT_ACTION)
            ->where('entidad_tipo', 'examen')
            ->where('entidad_id', $examId)
            ->orderByDesc('fecha')
            ->orderByDesc('id')
            ->get();

        $userIds = $rows->pluck('usuario_id')->filter()->unique()->values();
        $users = $userIds->isNotEmpty()
            ? User::whereIn('id', $userIds)->pluck('nombre', 'id')
            : collect();

        return $rows->map(function ($row) use ($users) {
            $details = $this->decodeDetails($row->detalles);
            $summary = $details['summary'] ?? [];
            $exam = $details['exam'] ?? [];

            return [
                'id' => (int) $row->id,
                'file_name' => $details['file_name'] ?? "reporte-detallado-{$row->entidad_id}-{$row->id}.pdf",
                'generated_at' => $details['generated_at'] ?? (string) $row->fecha,
                'generated_by' => $details['generated_by'] ?? ($users->get((int) $row->usuario_id) ?? 'Usuario'),
                'summary' => $summary,
                'included_sections' => $details['included_sections']
                    ?? $this->buildIncludedSections($exam, $summary),
            ];
        })->values()->all();
    }

    private function buildIncludedSections(array $exam, array $summary): array
    {
        $roomCount = count($exam['rooms'] ?? []);
        $entered = (int) ($summary['total_entered'] ?? 0);
        $absent = (int) ($summary['total_absent'] ?? 0);
        $observations = (int) ($summary['total_observations'] ?? 0);
        $expulsionsAndIncidents = (int) ($summary['total_expulsions'] ?? 0) + (int) ($summary['total_incidents'] ?? 0);

        return [
            "Datos generales y {$roomCount} " . ($roomCount === 1 ? 'punto de control' : 'puntos de control'),
            "Asistencia e ingresos ({$entered} presentes · {$absent} ausentes)",
            "Observaciones y autorizaciones ({$observations} registros)",
            "Expulsiones e incidentes ({$expulsionsAndIncidents} registros)",
        ];
    }

    private function buildReportFileName(Exam $exam): string
    {
        $subjectSlug = Str::slug((string) ($exam->courseGroup?->course?->nombre ?? "examen-{$exam->id}"));
        $groupSlug = Str::slug((string) ($exam->courseGroup?->grupo ?? 'g'));
        $typeSlug = Str::slug((string) ($exam->examType?->nombre ?? 'rep'));

        return "reporte-{$subjectSlug}-g{$groupSlug}-{$typeSlug}.pdf";
    }

    private function extractTimeFromTimestamp(?string $timestamp): string
    {
        if (!$timestamp) {
            return '';
        }

        if (preg_match('/(\d{2}:\d{2})/', $timestamp, $matches)) {
            return $matches[1];
        }

        return '';
    }

    private function decodeDetails(mixed $details): array
    {
        if (is_array($details)) {
            return $details;
        }

        return json_decode((string) ($details ?? '{}'), true) ?: [];
    }
}
