<?php

namespace App\Http\Controllers;

use App\Models\CourseGroup;
use App\Models\EnrollmentStatus;
use App\Models\Exam;
use App\Models\ExamRoom;
use App\Models\ExamStudent;
use App\Models\ExamStudentStatus;
use App\Models\Inscripcion;
use App\Models\Room;
use App\Models\SharedExamInvitation;
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

            if (!Schema::hasTable('examen_compartido')) {
                return response()->json([
                    'success' => true,
                    'data' => [],
                    'message' => 'Falta ejecutar la migración en la base de datos (php backend/artisan migrate).',
                ], 200);
            }

            // Find shared exams where user is the invited teacher OR the host teacher
            $invitations = SharedExamInvitation::with([
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
            ->where('estado', 'ACEPTADO')
            ->orderBy('created_at', 'desc')
            ->get();

            $data = $invitations->map(function (SharedExamInvitation $inv) use ($user) {
                $exam = $inv->exam;
                $hostCourseGroup = $exam?->courseGroup;
                $hostTeacher = $hostCourseGroup?->teacher;
                $coTeacher = $inv->invitedTeacher;
                $course = $hostCourseGroup?->course;
                $coCourseGroup = $inv->courseGroup;

                // Rooms and capacity
                $allRooms = [];
                $totalCapacity = 0;
                $totalAssigned = 0;

                if ($exam) {
                    foreach ($exam->rooms as $room) {
                        $assigned = (int) $room->pivot->cupo_asignado;
                        $capacity = (int) $room->capacidad;
                        $remaining = max(0, $capacity - $assigned);

                        $allRooms[] = [
                            'room_id' => (string) $room->id,
                            'room_name' => $room->nombre,
                            'capacity' => $capacity,
                            'assigned_capacity' => $assigned,
                            'remaining_capacity' => $remaining,
                            'assistant_id' => $room->pivot->auxiliar_id ? (int) $room->pivot->auxiliar_id : null,
                        ];

                        $totalCapacity += $capacity;
                        $totalAssigned += $assigned;
                    }
                }

                $isCoTeacher = ((int) $inv->docente_invitado_id === (int) $user->id);

                return [
                    'shared_exam_id' => $inv->id,
                    'invitation_id' => $inv->id,
                    'status' => $inv->estado,
                    'message' => $inv->mensaje,
                    'created_at' => $inv->created_at?->format('Y-m-d H:i:s'),
                    'is_co_teacher' => $isCoTeacher,
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
                        'co_teacher_name' => $coTeacher?->nombre ?? 'Docente Co-titular',
                        'co_teacher_email' => $coTeacher?->email ?? '',
                        'co_group_code' => $coCourseGroup?->grupo ?? '2',
                        'co_course_group_id' => $coCourseGroup?->id,
                        'all_rooms' => $allRooms,
                        'host_rooms' => $allRooms,
                        'total_capacity' => $totalCapacity,
                        'total_host_capacity' => $totalCapacity,
                        'total_assigned' => $totalAssigned,
                        'total_host_assigned' => $totalAssigned,
                        'total_remaining_capacity' => max(0, $totalCapacity - $totalAssigned),
                    ] : null,
                    'invited_group' => $coCourseGroup ? [
                        'course_group_id' => $coCourseGroup->id,
                        'group_code' => $coCourseGroup->grupo,
                        'academic_term' => $coCourseGroup->gestion,
                        'subject_name' => $coCourseGroup->course?->nombre ?? '',
                    ] : null,
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

            $invitation = SharedExamInvitation::with('exam.rooms')->find($sharedExamId);
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

            $invitation = SharedExamInvitation::with([
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
                'course_group_id' => 'required|integer',
                'rooms' => 'nullable|array',
                'rooms.*.room_id' => 'nullable',
                'rooms.*.room_name' => 'nullable|string',
                'rooms.*.assigned_capacity' => 'required|integer|min:1',
                'rooms.*.auxiliar_id' => 'nullable|integer',
            ], [
                'course_group_id.required' => 'Debe seleccionar el grupo que participará en el examen.',
                'rooms.*.assigned_capacity.min' => 'El cupo asignado debe ser mayor a 0.',
            ]);

            $courseGroupId = (int) $validated['course_group_id'];
            $courseGroup = CourseGroup::find($courseGroupId);

            if (!$courseGroup) {
                return response()->json(['success' => false, 'message' => 'El grupo seleccionado no existe.'], 422);
            }

            if ((int) $courseGroup->docente_id !== (int) $user->id) {
                return response()->json(['success' => false, 'message' => 'El grupo seleccionado no pertenece al docente autenticado.'], 403);
            }

            // Verify subject and academic term match (immutable parameters)
            if ((int) $courseGroup->materia_id !== (int) $exam->courseGroup?->materia_id ||
                $courseGroup->gestion !== $exam->courseGroup?->gestion) {
                return response()->json([
                    'success' => false,
                    'message' => 'El grupo debe pertenecer a la misma materia y gestión académica que el examen compartido.',
                ], 422);
            }

            // Get enrolled eligible students of this group
            $habilitadoStatus = EnrollmentStatus::where('nombre', 'HABILITADO')->first();
            $enrollmentQuery = Inscripcion::where('materia_grupo_id', $courseGroupId);
            if ($habilitadoStatus) {
                $enrollmentQuery->where('estado_inscripcion_id', $habilitadoStatus->id);
            }
            $studentsToAssign = $enrollmentQuery->pluck('usuario_id')->toArray();
            $studentCount = count($studentsToAssign);

            // Calculate host capacity
            $hostRemainingCapacity = 0;
            $hostRoomsWithRemaining = [];
            foreach ($exam->rooms as $room) {
                $cap = (int) $room->capacidad;
                $assigned = (int) $room->pivot->cupo_asignado;
                $free = max(0, $cap - $assigned);
                if ($free > 0) {
                    $hostRemainingCapacity += $free;
                    $hostRoomsWithRemaining[] = [
                        'room_id' => $room->id,
                        'free' => $free,
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
                $courseGroupId,
                $extraRoomsInput,
                $studentsToAssign,
                $hostRoomsWithRemaining,
                $ausenteStatus,
                $user
            ) {
                // 1. Update shared exam group
                $invitation->update([
                    'estado' => 'ACEPTADO',
                    'materia_grupo_id' => $courseGroupId,
                ]);

                // 2. Add extra rooms to examen_aula
                $allAllocations = [];

                foreach ($hostRoomsWithRemaining as $hr) {
                    $allAllocations[$hr['room_id']] = $hr['free'];
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

                    $auxiliarId = !empty($extra['auxiliar_id']) ? (int) $extra['auxiliar_id'] : null;

                    ExamRoom::updateOrCreate(
                        ['examen_id' => $exam->id, 'aula_id' => $roomId],
                        [
                            'cupo_asignado' => $assignedCap,
                            'auxiliar_id' => $auxiliarId,
                        ]
                    );

                    $allAllocations[$roomId] = ($allAllocations[$roomId] ?? 0) + $assignedCap;
                }

                // 3. Assign students to rooms in examen_estudiante
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

                    ExamStudent::updateOrCreate(
                        ['examen_id' => $exam->id, 'usuario_id' => $studentId],
                        [
                            'aula_id' => $assignedRoomId,
                            'estado_id' => $ausenteStatus?->id ?? 1,
                            'hora_ingreso' => null,
                            'observaciones' => null,
                        ]
                    );
                }

                // 4. Audit entry
                DB::table('registro_auditoria')->insert([
                    'usuario_id' => $user->id,
                    'accion' => 'MODIFICAR_ASIGNACION_EXAMEN_COMPARTIDO',
                    'entidad_tipo' => 'examen',
                    'entidad_id' => $exam->id,
                    'detalles' => json_encode([
                        'examen_compartido_id' => $invitation->id,
                        'materia_grupo_id' => $courseGroupId,
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
                    'course_group_id' => $courseGroupId,
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
