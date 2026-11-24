<?php

namespace App\Http\Controllers;

use App\Models\CourseGroup;
use App\Models\EnrollmentStatus;
use App\Models\Exam;
use App\Models\ExamInvitation;
use App\Models\ExamRoom;
use App\Models\ExamStudent;
use App\Models\ExamStudentStatus;
use App\Models\Inscripcion;
use App\Models\Room;
use App\Models\SharedExamInvitation;
use App\Models\User;
use App\Modules\CoreDataStorage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Throwable;

class SharedExamController extends Controller
{
    public function __construct(
        private readonly CoreDataStorage $storage
    ) {}

    /**
     * List all shared exams where the authenticated teacher participates.
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $user = auth()->user();
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'No autorizado.',
                ], 401);
            }

            if (!Schema::hasTable('examen_invitacion') && !Schema::hasTable('examen_compartido')) {
                return response()->json([
                    'success' => true,
                    'data' => [],
                    'message' => 'Falta ejecutar la migración en la base de datos (php backend/artisan migrate).',
                ], 200);
            }

            try {
                if (Schema::hasTable('examen_invitacion') && !Schema::hasColumn('examen_invitacion', 'materia_grupo_ids')) {
                    Schema::table('examen_invitacion', function ($table) {
                        $table->string('materia_grupo_ids', 255)->nullable();
                    });
                }
            } catch (\Throwable $e) {
                Log::error('Error ensuring materia_grupo_ids column: ' . $e->getMessage());
            }

            // Find shared exams where user is the invited teacher OR the host teacher
            $invitations = ExamInvitation::with([
                'exam.courseGroup.course',
                'exam.courseGroup.teacher',
                'exam.examType',
                'exam.rooms',
                'exam.examRooms',
                'exam.examStudents',
                'invitedTeacher',
                'courseGroup.course',
            ])
            ->where(function ($query) use ($user) {
                $query->where('docente_invitado_id', $user->id)
                      ->orWhereHas('exam.courseGroup', fn($q) => $q->where('docente_id', $user->id));
            })
            ->orderBy('created_at', 'desc')
            ->get();

            $data = $invitations->map(function (ExamInvitation $inv) use ($user) {
                $exam = $inv->exam;
                $hostCourseGroup = $exam?->courseGroup;
                $hostTeacher = $hostCourseGroup?->teacher;
                $coTeacher = $inv->invitedTeacher;
                $course = $hostCourseGroup?->course;
                $coCourseGroup = $inv->courseGroup;

                // Rooms and capacity
                $allRooms = [];
                $hostRooms = [];
                $extraRooms = [];
                $totalCapacity = 0;
                $totalAssigned = 0;
                $totalHostRemaining = 0;

                if ($exam) {
                    $hostStudentIds = $hostCourseGroup
                        ? DB::table('inscripcion')->where('materia_grupo_id', $hostCourseGroup->id)->pluck('usuario_id')->toArray()
                        : [];

                    // Determine assigned groups explicitly from invitation
                    $assignedGroupIds = [];
                    $assignedGroupCodes = [];

                    if (!empty($inv->materia_grupo_ids)) {
                        $decoded = json_decode($inv->materia_grupo_ids, true);
                        if (is_array($decoded) && !empty($decoded)) {
                            $assignedGroupIds = array_values(array_map('intval', $decoded));
                        }
                    }

                    if (empty($assignedGroupIds) && $inv->materia_grupo_id) {
                        $assignedGroupIds = [(int) $inv->materia_grupo_id];
                    }

                    if (!empty($assignedGroupIds)) {
                        $assignedGroupCodes = DB::table('materia_grupo')
                            ->whereIn('id', $assignedGroupIds)
                            ->orderBy('grupo')
                            ->pluck('grupo')
                            ->toArray();
                    } elseif ($coCourseGroup) {
                        $assignedGroupIds = [(int) $coCourseGroup->id];
                        $assignedGroupCodes = [(string) $coCourseGroup->grupo];
                    }

                    $coStudentIds = !empty($assignedGroupIds)
                        ? DB::table('inscripcion')->whereIn('materia_grupo_id', $assignedGroupIds)->pluck('usuario_id')->toArray()
                        : ($coCourseGroup ? DB::table('inscripcion')->where('materia_grupo_id', $coCourseGroup->id)->pluck('usuario_id')->toArray() : []);

                    $hostOccupiedSeats = count($hostStudentIds);

                    $hostTeacherId = $hostCourseGroup?->docente_id;
                    $hostGroupEnrollments = $hostCourseGroup ? DB::table('inscripcion')->where('materia_grupo_id', $hostCourseGroup->id)->count() : 0;
                    $hostOccupiedSeats = max(count($hostStudentIds), $hostGroupEnrollments);

                    $hostRoomIds = !empty($hostStudentIds)
                        ? DB::table('examen_estudiante')
                            ->where('examen_id', $exam->id)
                            ->whereIn('usuario_id', $hostStudentIds)
                            ->pluck('aula_id')
                            ->unique()
                            ->toArray()
                        : [];

                    if (empty($hostRoomIds)) {
                        $hostRoomIds = $exam->rooms
                            ->filter(fn($r) => $hostTeacherId && (int)$r->pivot->auxiliar_id === (int)$hostTeacherId)
                            ->pluck('id')
                            ->toArray();
                    }

                    if (empty($hostRoomIds)) {
                        $hostRoomIds = $exam->rooms->take(1)->pluck('id')->toArray();
                    }

                    foreach ($exam->rooms as $room) {
                        $capacity = (int) $room->capacidad;
                        $pivotAssigned = (int) $room->pivot->cupo_asignado;

                        $hostStudentsInRoom = !empty($hostStudentIds)
                            ? DB::table('examen_estudiante')->where('examen_id', $exam->id)->where('aula_id', $room->id)->whereIn('usuario_id', $hostStudentIds)->count()
                            : 0;
                        $coStudentsInRoom = !empty($coStudentIds)
                            ? DB::table('examen_estudiante')->where('examen_id', $exam->id)->where('aula_id', $room->id)->whereIn('usuario_id', $coStudentIds)->count()
                            : 0;

                        // A host room is strictly from $hostRoomIds (where host students are located)
                        $isHostRoom = in_array($room->id, $hostRoomIds);

                        if ($isHostRoom) {
                            $hostSeats = max($hostStudentsInRoom, min($capacity, $hostOccupiedSeats));
                            $remainingForGuest = max(0, $capacity - $hostSeats);

                            $hostRooms[] = [
                                'room_id' => (string) $room->id,
                                'room_name' => $room->nombre,
                                'capacity' => $capacity,
                                'assigned_capacity' => $hostSeats,
                                'remaining_capacity' => $remainingForGuest,
                                'assistant_id' => $room->pivot->auxiliar_id ? (int) $room->pivot->auxiliar_id : null,
                            ];

                            $totalHostRemaining += $remainingForGuest;
                        } else {
                            $assignedToGuest = $coStudentsInRoom > 0 ? $coStudentsInRoom : $pivotAssigned;
                            $extraRooms[] = [
                                'room_id' => $room->id,
                                'room_name' => $room->nombre,
                                'max_capacity' => $capacity,
                                'assigned_capacity' => $assignedToGuest,
                                'is_manual' => false,
                            ];
                        }

                        $allRooms[] = [
                            'room_id' => (string) $room->id,
                            'room_name' => $room->nombre,
                            'capacity' => $capacity,
                            'assigned_capacity' => $pivotAssigned,
                            'remaining_capacity' => max(0, $capacity - $pivotAssigned),
                            'assistant_id' => $room->pivot->auxiliar_id ? (int) $room->pivot->auxiliar_id : null,
                        ];

                        $totalCapacity += $capacity;
                        $totalAssigned += $pivotAssigned;
                    }

                    if (empty($hostRooms)) {
                        $hostRooms = $allRooms;
                        $totalHostRemaining = max(0, $totalCapacity - $totalAssigned);
                    }
                }

                $isCoTeacher = ((int) $inv->docente_invitado_id === (int) $user->id);
                $isPending = empty($inv->materia_grupo_id) || $inv->estado === 'PENDIENTE';
                $status = $isPending ? 'PENDIENTE' : 'ACEPTADO';

                return [
                    'shared_exam_id' => $inv->id,
                    'invitation_id' => $inv->id,
                    'status' => $status,
                    'message' => $inv->mensaje,
                    'created_at' => $inv->created_at?->format('Y-m-d H:i:s'),
                    'is_co_teacher' => $isCoTeacher,
                    'extra_rooms' => $extraRooms,
                    'exam' => $exam ? [
                        'exam_id' => $exam->id,
                        'exam_type' => $exam->examType?->nombre ?? 'PRIMER PARCIAL',
                        'date' => $exam->fecha ? $exam->fecha->format('Y-m-d') : null,
                        'start_time' => (string) $exam->hora_inicio,
                        'end_time' => (string) $exam->hora_fin,
                        'subject_code' => $course?->sigla ?? '',
                        'subject_name' => $course?->nombre ?? '',
                        'academic_term' => $hostCourseGroup?->gestion ?? '',
                        'host_teacher_name' => $hostTeacher?->nombre ?? 'Docente Titular',
                        'host_teacher_email' => $hostTeacher?->email ?? '',
                        'host_group_code' => $hostCourseGroup?->grupo ?? '1',
                        'host_course_group_id' => $hostCourseGroup?->id,
                        'host_enrolled_count' => $hostOccupiedSeats,
                        'co_teacher_name' => $coTeacher?->nombre ?? 'Docente Co-titular',
                        'co_teacher_email' => $coTeacher?->email ?? '',
                        'co_group_code' => !empty($assignedGroupCodes) ? implode(', ', $assignedGroupCodes) : ($coCourseGroup?->grupo ?? null),
                        'co_course_group_id' => $coCourseGroup?->id,
                        'co_course_group_ids' => $assignedGroupIds,
                        'co_enrolled_count' => count($coStudentIds),
                        'all_rooms' => $allRooms,
                        'host_rooms' => $hostRooms,
                        'total_capacity' => $totalCapacity,
                        'total_host_capacity' => $totalCapacity,
                        'total_assigned' => $totalAssigned,
                        'total_host_assigned' => $totalAssigned,
                        'total_remaining_capacity' => $totalHostRemaining,
                    ] : null,
                    'invited_group' => $coCourseGroup ? [
                        'course_group_id' => $coCourseGroup->id,
                        'group_code' => !empty($assignedGroupCodes) ? implode(', ', $assignedGroupCodes) : $coCourseGroup->grupo,
                        'academic_term' => $coCourseGroup->gestion,
                        'subject_name' => $coCourseGroup->course?->nombre ?? '',
                    ] : null,
                    'assigned_course_group_ids' => $assignedGroupIds,
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $data,
                'message' => 'Exámenes compartidos obtenidos exitosamente.',
            ], 200);
        } catch (Throwable $e) {
            Log::error('Error fetching shared exams: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener los exámenes compartidos.',
            ], 500);
        }
    }

    /**
     * Backward-compatible endpoint to list invitations.
     */
    public function invitations(Request $request): JsonResponse
    {
        return $this->index($request);
    }

    /**
     * Get available rooms for a shared exam (excluding rooms already reserved).
     */
    public function availableRooms(int $sharedExamId): JsonResponse
    {
        try {
            $user = auth()->user();
            if (!$user) {
                return response()->json(['success' => false, 'message' => 'No autorizado.'], 401);
            }

            $invitation = ExamInvitation::with('exam.rooms')->find($sharedExamId);
            if (!$invitation) {
                return response()->json(['success' => false, 'message' => 'Examen compartido no encontrado.'], 404);
            }

            $exam = $invitation->exam;
            if (!$exam) {
                return response()->json(['success' => false, 'message' => 'Examen no encontrado.'], 404);
            }

            $date = $exam->fecha->format('Y-m-d');
            $startTime = (string) $exam->hora_inicio;
            $endTime = (string) $exam->hora_fin;

            $allAvailable = $this->storage->getAvailableRooms($date, $startTime, $endTime);
            $alreadyAssignedIds = $exam->rooms->pluck('id')->map(fn($id) => (string) $id)->toArray();

            // Filter out rooms already allocated to this exam
            $extraAvailable = array_values(array_filter(
                $allAvailable,
                fn($room) => !in_array((string) $room->roomId, $alreadyAssignedIds, true)
            ));

            return response()->json([
                'success' => true,
                'data' => array_map(fn($r) => $r->toArray(), $extraAvailable),
                'message' => 'Aulas disponibles obtenidas exitosamente.',
            ], 200);
        } catch (Throwable $e) {
            Log::error('Error fetching available rooms for shared exam: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Error al obtener aulas disponibles.'], 500);
        }
    }

    /**
     * Update student group and additional room allocation for a shared exam.
     */
    public function updateAllocation(int $sharedExamId, Request $request): JsonResponse
    {
        try {
            $user = auth()->user();
            if (!$user) {
                return response()->json(['success' => false, 'message' => 'No autorizado.'], 401);
            }

            $invitation = ExamInvitation::with([
                'exam.rooms',
                'exam.courseGroup',
                'exam.examStudents',
            ])->find($sharedExamId);

            if (!$invitation) {
                return response()->json(['success' => false, 'message' => 'Examen compartido no encontrado.'], 404);
            }

            // Only the participating co-teacher can modify their own student group & additional rooms
            if ((int) $invitation->docente_invitado_id !== (int) $user->id) {
                return response()->json(['success' => false, 'message' => 'Solo el docente co-titular puede modificar la asignación de su grupo.'], 403);
            }

            $exam = $invitation->exam;
            if (!$exam || !$exam->activo) {
                return response()->json(['success' => false, 'message' => 'El examen no está activo o no existe.'], 422);
            }

            $validated = $request->validate([
                'course_group_id' => 'nullable|integer',
                'course_group_ids' => 'nullable|array',
                'course_group_ids.*' => 'integer',
                'rooms' => 'nullable|array',
                'rooms.*.room_id' => 'nullable',
                'rooms.*.room_name' => 'nullable|string',
                'rooms.*.assigned_capacity' => 'required|integer|min:1',
                'rooms.*.auxiliar_id' => 'nullable|integer',
            ], [
                'rooms.*.assigned_capacity.min' => 'El cupo asignado debe ser mayor a 0.',
            ]);

            $courseGroupIds = !empty($validated['course_group_ids'])
                ? array_values(array_unique(array_map('intval', $validated['course_group_ids'])))
                : (!empty($validated['course_group_id']) ? [(int) $validated['course_group_id']] : []);

            if (empty($courseGroupIds)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Debe seleccionar al menos un grupo para participar en el examen.',
                ], 422);
            }

            $courseGroups = CourseGroup::whereIn('id', $courseGroupIds)->get();
            if ($courseGroups->count() !== count($courseGroupIds)) {
                return response()->json(['success' => false, 'message' => 'Uno o más grupos seleccionados no existen.'], 422);
            }

            foreach ($courseGroups as $courseGroup) {
                if ((int) $courseGroup->docente_id !== (int) $user->id) {
                    return response()->json(['success' => false, 'message' => 'El grupo seleccionado no pertenece al docente autenticado.'], 403);
                }

                // Verify subject and academic term match (immutable parameters)
                if ((int) $courseGroup->materia_id !== (int) $exam->courseGroup?->materia_id ||
                    $courseGroup->gestion !== $exam->courseGroup?->gestion) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Los grupos deben pertenecer a la misma materia y gestión académica que el examen compartido.',
                    ], 422);
                }
            }

            // Get enrolled eligible students of these groups
            $habilitadoStatus = EnrollmentStatus::where('nombre', 'HABILITADO')->first();
            $enrollmentQuery = Inscripcion::whereIn('materia_grupo_id', $courseGroupIds);
            if ($habilitadoStatus) {
                $enrollmentQuery->where('estado_inscripcion_id', $habilitadoStatus->id);
            }
            $studentsToAssign = $enrollmentQuery->pluck('usuario_id')->unique()->toArray();
            $studentCount = count($studentsToAssign);

            // Calculate host capacity strictly from host rooms
            $hostRemainingCapacity = 0;
            $hostRoomsWithRemaining = [];
            $hostGroup = $exam->courseGroup;
            $hostStudentIds = $hostGroup ? DB::table('inscripcion')->where('materia_grupo_id', $hostGroup->id)->pluck('usuario_id')->toArray() : [];
            $hostOccupiedSeats = count($hostStudentIds);

            $hostRoomIds = !empty($hostStudentIds)
                ? DB::table('examen_estudiante')
                    ->where('examen_id', $exam->id)
                    ->whereIn('usuario_id', $hostStudentIds)
                    ->pluck('aula_id')
                    ->unique()
                    ->toArray()
                : [];

            if (empty($hostRoomIds)) {
                $hostTeacherId = $hostGroup?->docente_id;
                $hostRoomIds = $exam->rooms
                    ->filter(fn($r) => $hostTeacherId && (int)$r->pivot->auxiliar_id === (int)$hostTeacherId)
                    ->pluck('id')
                    ->toArray();
            }

            if (empty($hostRoomIds)) {
                $hostRoomIds = $exam->rooms->take(1)->pluck('id')->toArray();
            }

            foreach ($exam->rooms as $room) {
                if (!in_array($room->id, $hostRoomIds)) {
                    continue; // Skip extra rooms here, they are supplied in $extraRoomsInput
                }

                $cap = (int) $room->capacidad;
                $assigned = min($cap, $hostOccupiedSeats);
                $free = max(0, $cap - $assigned);
                if ($free > 0) {
                    $hostRemainingCapacity += $free;
                    $hostRoomsWithRemaining[] = [
                        'room_id' => $room->id,
                        'free' => $free,
                        'current_assigned' => $assigned,
                        'capacity' => $cap,
                    ];
                }
            }

            // Extra rooms capacity
            $extraRoomsInput = $validated['rooms'] ?? [];
            $extraCapacityTotal = 0;
            foreach ($extraRoomsInput as $extraRoom) {
                $extraCapacityTotal += (int) $extraRoom['assigned_capacity'];
            }

            $totalAvailableCapacity = $hostRemainingCapacity + $extraCapacityTotal;

            // If total available capacity is less than studentCount, check if extra rooms have room to expand (e.g. Auditorio with capacity 200)
            if ($studentCount > 0 && $totalAvailableCapacity < $studentCount) {
                $deficit = $studentCount - $totalAvailableCapacity;
                foreach ($extraRoomsInput as &$extraRoom) {
                    $rawRoomId = $extraRoom['room_id'] ?? null;
                    $rModel = !empty($rawRoomId) && !str_starts_with((string)$rawRoomId, 'manual-')
                        ? Room::find((int)$rawRoomId)
                        : null;
                    $maxCap = $rModel ? (int)$rModel->capacidad : 200;
                    $currAssigned = (int)$extraRoom['assigned_capacity'];
                    $canExpand = max(0, $maxCap - $currAssigned);

                    if ($canExpand > 0) {
                        $expandBy = min($deficit, $canExpand);
                        $extraRoom['assigned_capacity'] = $currAssigned + $expandBy;
                        $extraCapacityTotal += $expandBy;
                        $totalAvailableCapacity += $expandBy;
                        $deficit -= $expandBy;
                        if ($deficit <= 0) break;
                    }
                }
                unset($extraRoom);
            }

            if ($studentCount > 0 && $totalAvailableCapacity < $studentCount) {
                return response()->json([
                    'success' => false,
                    'message' => "Capacidad insuficiente: Tu grupo tiene {$studentCount} estudiantes inscritos, pero solo hay capacidad para {$totalAvailableCapacity}. Por favor asigna aulas adicionales.",
                ], 422);
            }

            $ausenteStatus = ExamStudentStatus::where('nombre', 'AUSENTE')->first()
                ?? ExamStudentStatus::first();

            DB::transaction(function () use (
                $invitation,
                $exam,
                $courseGroupIds,
                $extraRoomsInput,
                $studentsToAssign,
                $hostRoomsWithRemaining,
                $hostRoomIds,
                $ausenteStatus,
                $user
            ) {
                // 1. Update shared exam primary group
                $updateFields = [
                    'materia_grupo_id' => $courseGroupIds[0],
                ];
                if (Schema::hasColumn('examen_invitacion', 'materia_grupo_ids')) {
                    $updateFields['materia_grupo_ids'] = json_encode($courseGroupIds);
                }
                if (Schema::hasColumn('examen_invitacion', 'estado')) {
                    $updateFields['estado'] = 'ACEPTADO';
                }
                $invitation->update($updateFields);
                DB::table('examen_invitacion')->where('id', $invitation->id)->update($updateFields);

                // 2. Add extra rooms to examen_aula and update host rooms
                $allAllocations = [];
                $savedExtraRoomIds = [];

                foreach ($hostRoomsWithRemaining as $hr) {
                    $allAllocations[$hr['room_id']] = $hr['free'];

                    DB::table('examen_aula')->updateOrInsert(
                        ['examen_id' => $exam->id, 'aula_id' => $hr['room_id']],
                        [
                            'cupo_asignado' => min($hr['capacity'], $hr['current_assigned'] + $hr['free']),
                            'updated_at' => now(),
                        ]
                    );
                }

                foreach ($extraRoomsInput as $extra) {
                    $rawRoomId = $extra['room_id'] ?? null;
                    $roomName = !empty($extra['room_name']) ? trim($extra['room_name']) : null;
                    $assignedCap = (int) $extra['assigned_capacity'];

                    if (empty($rawRoomId) || str_starts_with((string)$rawRoomId, 'manual-')) {
                        $roomModel = Room::firstOrCreate(
                            ['nombre' => $roomName ?: ('Aula ' . uniqid())],
                            ['capacidad' => $assignedCap]
                        );
                        $roomId = $roomModel->id;
                    } else {
                        $roomId = (int) $rawRoomId;
                    }

                    $savedExtraRoomIds[] = $roomId;
                    $auxiliarId = !empty($extra['auxiliar_id']) ? (int) $extra['auxiliar_id'] : null;

                    DB::table('examen_aula')->updateOrInsert(
                        ['examen_id' => $exam->id, 'aula_id' => $roomId],
                        [
                            'cupo_asignado' => $assignedCap,
                            'auxiliar_id' => $auxiliarId,
                            'updated_at' => now(),
                        ]
                    );

                    $allAllocations[$roomId] = ($allAllocations[$roomId] ?? 0) + $assignedCap;
                }

                // Delete previous extra rooms that were removed by the teacher
                $allowedRoomIds = array_merge($hostRoomIds, $savedExtraRoomIds);
                DB::table('examen_aula')
                    ->where('examen_id', $exam->id)
                    ->whereNotIn('aula_id', $allowedRoomIds)
                    ->delete();

                // 3. Remove any students from this teacher that belong to groups no longer selected
                $teacherAllGroupIds = CourseGroup::where('docente_id', $user->id)
                    ->where('materia_id', $exam->courseGroup?->materia_id)
                    ->pluck('id')
                    ->toArray();
                $unselectedGroupIds = array_diff($teacherAllGroupIds, $courseGroupIds);
                if (!empty($unselectedGroupIds)) {
                    $unselectedStudentIds = DB::table('inscripcion')
                        ->whereIn('materia_grupo_id', $unselectedGroupIds)
                        ->pluck('usuario_id')
                        ->toArray();
                    if (!empty($unselectedStudentIds)) {
                        DB::table('examen_estudiante')
                            ->where('examen_id', $exam->id)
                            ->whereIn('usuario_id', $unselectedStudentIds)
                            ->delete();
                    }
                }

                // 4. Assign students to rooms in examen_estudiante
                $roomQueue = [];
                foreach ($allAllocations as $rId => $slots) {
                    for ($i = 0; $i < $slots; $i++) {
                        $roomQueue[] = $rId;
                    }
                }

                $roomIndex = 0;
                foreach ($studentsToAssign as $studentId) {
                    $assignedRoomId = $roomQueue[$roomIndex] ?? null;
                    $roomIndex++;

                    DB::table('examen_estudiante')->updateOrInsert(
                        ['examen_id' => $exam->id, 'usuario_id' => $studentId],
                        [
                            'aula_id' => $assignedRoomId,
                            'estado_id' => $ausenteStatus?->id ?? 1,
                            'hora_ingreso' => null,
                            'observaciones' => null,
                            'updated_at' => now(),
                        ]
                    );
                }

                // 5. Audit entry
                DB::table('registro_auditoria')->insert([
                    'usuario_id' => $user->id,
                    'accion' => 'MODIFICAR_ASIGNACION_EXAMEN_COMPARTIDO',
                    'entidad_tipo' => 'examen',
                    'entidad_id' => $exam->id,
                    'detalles' => json_encode([
                        'examen_compartido_id' => $invitation->id,
                        'materia_grupo_ids' => $courseGroupIds,
                        'estudiantes_asignados' => count($studentsToAssign),
                        'aulas_adicionales' => count($extraRoomsInput),
                        'ip' => request()->ip() ?? '127.0.0.1',
                    ], JSON_UNESCAPED_UNICODE),
                    'fecha' => now(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            });

            return response()->json([
                'success' => true,
                'message' => 'Asignación de estudiantes y aulas actualizada exitosamente.',
                'data' => [
                    'shared_exam_id' => $invitation->id,
                    'exam_id' => $exam->id,
                    'course_group_id' => $courseGroupIds[0],
                    'course_group_ids' => $courseGroupIds,
                    'total_assigned_students' => $studentCount,
                ],
            ], 200);
        } catch (Throwable $e) {
            Log::error('Error updating shared exam allocation: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar la asignación: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Backward-compatible alias for accept.
     */
    public function accept(int $invitationId, Request $request): JsonResponse
    {
        return $this->updateAllocation($invitationId, $request);
    }
}
