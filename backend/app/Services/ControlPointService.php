<?php

namespace App\Services;

use App\Models\Exam;
use App\Models\ExamRoom;
use App\Models\User;
use App\Models\ControlPoint;
use App\Models\ControlPointAssignment;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Carbon;
use App\Models\ControlPointRotationRequest;

class ControlPointService
{
    public function isAuthorized(int $examId, int $userId): bool
    {
        $user = User::find($userId);

        if (!$user || !$user->activo) {
            return false;
        }

        $exam = Exam::with('courseGroup')->find($examId);

        if (!$exam) {
            return false;
        }

        $isExamTeacher =
            (int) $exam->courseGroup?->docente_id === $userId;

        $isAssignedAssistant = ExamRoom::where('examen_id', $examId)
            ->where('auxiliar_id', $userId)
            ->exists();

        return $isExamTeacher || $isAssignedAssistant;
    }

    private function getAuthorizedExam(
        int $examId,
        int $userId
    ): Exam {
        $exam = Exam::with('courseGroup')->findOrFail($examId);

        abort_unless(
            $this->isAuthorized($examId, $userId),
            403,
            'No tienes autorización para acceder a este examen.'
        );

        return $exam;
    }

    private function validateExamAvailability(Exam $exam): void
    {
        $timezone = 'America/La_Paz';

        $endDateTime = Carbon::parse(
            $exam->fecha->format('Y-m-d') . ' ' . $exam->hora_fin,
            $timezone
        );

        $currentDateTime = Carbon::now($timezone);

        abort_if(
            !$exam->activo || $currentDateTime->greaterThanOrEqualTo($endDateTime),
            422,
            'El examen ha finalizado o no está disponible.'
        );
    }

    private function initializeControlPoints(Exam $exam): void
    {
        $rooms = ExamRoom::where('examen_id', $exam->id)->get();

        foreach ($rooms as $room) {
            foreach ([
                ControlPoint::ENTRY,
                ControlPoint::DURING_EXAM,
            ] as $controlType) {
                ControlPoint::firstOrCreate(
                    [
                        'exam_id' => $exam->id,
                        'room_id' => $room->aula_id,
                        'control_type' => $controlType,
                    ],
                    [
                        'is_active' => true,
                    ]
                );
            }
        }
    }

    private function activeAssignmentQuery(
        int $examId,
        int $userId
    ) {
        return ControlPointAssignment::where('user_id', $userId)
            ->whereNull('ended_at')
            ->whereHas(
                'controlPoint',
                fn ($query) => $query->where('exam_id', $examId)
            );
    }

    public function getActiveAssignment(
        int $examId,
        int $userId
    ): ?ControlPointAssignment {
        return $this->activeAssignmentQuery($examId, $userId)
            ->with('controlPoint.room')
            ->first();
    }

    public function getControlPoints(
        int $examId,
        int $userId
    ): array {
        return DB::transaction(function () use ($examId, $userId) {
            $exam = $this->getAuthorizedExam($examId, $userId);

            $exam = Exam::whereKey($exam->id)
                ->lockForUpdate()
                ->firstOrFail();

            $this->validateExamAvailability($exam);
            $this->initializeControlPoints($exam);

            $currentAssignment = $this->getActiveAssignment(
                $examId,
                $userId
            );

            $points = ControlPoint::where('exam_id', $examId)
                ->where('is_active', true)
                ->with([
                    'room',
                    'activeAssignments.user',
                ])
                ->orderBy('room_id')
                ->orderBy('control_type')
                ->get()
                ->map(function (ControlPoint $point) use ($userId) {
                    return [
                        'id' => $point->id,
                        'exam_id' => $point->exam_id,
                        'room_id' => $point->room_id,
                        'room_name' => $point->room?->nombre,
                        'control_type' => $point->control_type,
                        'is_active' => $point->is_active,
                        'active_responsibles_count' =>
                            $point->activeAssignments->count(),
                        'is_current' => $point->activeAssignments
                            ->contains(
                                fn ($assignment) =>
                                    (int) $assignment->user_id === $userId
                            ),
                        'responsibles' => $point->activeAssignments
                            ->map(fn ($assignment) => [
                                'user_id' => $assignment->user_id,
                                'name' => $assignment->user?->nombre,
                                'started_at' => $assignment->started_at,
                            ])
                            ->values()
                            ->all(),
                    ];
                })
                ->values()
                ->all();

            return [
                'current_assignment' => $currentAssignment,
                'control_points' => $points,
            ];
        });
    }

    
    public function join(int $examId,int $pointId,int $userId): array {
        return DB::transaction(function () use (
            $examId,
            $pointId,
            $userId
        ) {
            $this->getAuthorizedExam($examId, $userId);

            $exam = Exam::whereKey($examId)
                ->lockForUpdate()
                ->firstOrFail();

            $this->validateExamAvailability($exam);
            $this->initializeControlPoints($exam);

            $point = ControlPoint::whereKey($pointId)
                ->where('exam_id', $examId)
                ->where('is_active', true)
                ->firstOrFail();

            $currentAssignment = $this->activeAssignmentQuery(
                $examId,
                $userId
            )->lockForUpdate()->first();

            if ($currentAssignment) {
                if ((int) $currentAssignment->control_point_id === $pointId) {
                    return [
                        'message' => 'Ya estás asignado a este punto de control.',
                        'assignment' => $currentAssignment->load('controlPoint.room'),
                    ];
                }

                $currentPoint = ControlPoint::whereKey(
                    $currentAssignment->control_point_id
                )->firstOrFail();

                abort_if(
                    (int) $currentPoint->room_id !== (int) $point->room_id,
                    409,
                    'No puedes cambiar de aula mientras tienes una asignación activa.'
                );

                abort_if(
                    $currentPoint->control_type === $point->control_type,
                    409,
                    'El cambio solo está permitido entre Ingreso y Durante el examen.'
                );

                $rotationTime = now();

                $currentAssignment->update([
                    'ended_at' => $rotationTime,
                ]);
            }

            $assignment = ControlPointAssignment::create([
                'control_point_id' => $point->id,
                'user_id' => $userId,
                'started_at' => now(),
                'ended_at' => null,
            ]);

            return [
                'message' => 'Punto de control asignado correctamente.',
                'assignment' => $assignment->load('controlPoint.room'),
            ];
        });
    }

    
        public function requestRotation(
        int $examId,
        int $targetPointId,
        int $receiverId,
        int $requesterId
    ): array {
        return DB::transaction(function () use (
            $examId,
            $targetPointId,
            $receiverId,
            $requesterId
        ) {
            $exam = Exam::whereKey($examId)
                ->lockForUpdate()
                ->firstOrFail();

            $this->getAuthorizedExam($examId, $requesterId);
            $this->getAuthorizedExam($examId, $receiverId);
            $this->validateExamAvailability($exam);

            abort_if(
                $requesterId === $receiverId,
                422,
                'No puedes intercambiar el punto de control contigo mismo.'
            );

            $requesterAssignment = $this
                ->activeAssignmentQuery($examId, $requesterId)
                ->lockForUpdate()
                ->first();

            $receiverAssignment = $this
                ->activeAssignmentQuery($examId, $receiverId)
                ->lockForUpdate()
                ->first();

            abort_unless(
                $requesterAssignment && $receiverAssignment,
                409,
                'Ambos responsables deben tener un punto de control activo.'
            );

            $requesterPoint = ControlPoint::whereKey(
                $requesterAssignment->control_point_id
            )
                ->where('exam_id', $examId)
                ->where('is_active', true)
                ->firstOrFail();

            $receiverPoint = ControlPoint::whereKey(
                $receiverAssignment->control_point_id
            )
                ->where('exam_id', $examId)
                ->where('is_active', true)
                ->firstOrFail();

            abort_if(
                (int) $receiverPoint->id !== $targetPointId,
                409,
                'El responsable seleccionado ha cambiado de punto de control.'
            );

            abort_if(
                (int) $requesterPoint->id === (int) $receiverPoint->id,
                422,
                'Ambos responsables se encuentran en el mismo punto de control.'
            );

            $assignmentIds = [
                $requesterAssignment->id,
                $receiverAssignment->id,
            ];

            $hasPendingRequest = ControlPointRotationRequest::where(
                'status',
                ControlPointRotationRequest::PENDING
            )
                ->whereHas(
                    'requesterAssignment',
                    fn ($query) => $query->whereNull('ended_at')
                )
                ->whereHas(
                    'receiverAssignment',
                    fn ($query) => $query->whereNull('ended_at')
                )
                ->where(function ($query) use ($assignmentIds) {
                    $query->whereIn(
                        'requester_assignment_id',
                        $assignmentIds
                    )->orWhereIn(
                        'receiver_assignment_id',
                        $assignmentIds
                    );
                })
                ->exists();

            abort_if(
                $hasPendingRequest,
                409,
                'Uno de los responsables tiene una solicitud de intercambio pendiente.'
            );

            $rotationRequest = ControlPointRotationRequest::create([
                'requester_assignment_id' => $requesterAssignment->id,
                'receiver_assignment_id' => $receiverAssignment->id,
                'status' => ControlPointRotationRequest::PENDING,
                'responded_at' => null,
            ]);

            return [
                'message' => 'Solicitud de intercambio enviada correctamente.',
                'request' => $this->formatRotationRequest(
                    $rotationRequest
                ),
            ];
        });
    }

    public function respondToRotation(
        int $examId,
        int $requestId,
        int $userId,
        bool $accepted
    ): array {
        return DB::transaction(function () use (
            $examId,
            $requestId,
            $userId,
            $accepted
        ) {
            $exam = Exam::whereKey($examId)
                ->lockForUpdate()
                ->firstOrFail();

            $this->getAuthorizedExam($examId, $userId);
            $this->validateExamAvailability($exam);

            $rotationRequest = ControlPointRotationRequest::whereKey(
                $requestId
            )
                ->whereHas(
                    'requesterAssignment.controlPoint',
                    fn ($query) => $query->where('exam_id', $examId)
                )
                ->whereHas(
                    'receiverAssignment.controlPoint',
                    fn ($query) => $query->where('exam_id', $examId)
                )
                ->lockForUpdate()
                ->firstOrFail();

            $requesterAssignment = ControlPointAssignment::whereKey(
                $rotationRequest->requester_assignment_id
            )
                ->lockForUpdate()
                ->firstOrFail();

            $receiverAssignment = ControlPointAssignment::whereKey(
                $rotationRequest->receiver_assignment_id
            )
                ->lockForUpdate()
                ->firstOrFail();

            abort_unless(
                (int) $receiverAssignment->user_id === $userId,
                403,
                'No tienes autorización para responder esta solicitud.'
            );

            abort_if(
                $rotationRequest->status
                    !== ControlPointRotationRequest::PENDING,
                409,
                'Esta solicitud ya fue respondida.'
            );

            if (!$accepted) {
                $rotationRequest->update([
                    'status' => ControlPointRotationRequest::REJECTED,
                    'responded_at' => now(),
                ]);

                return [
                    'message' => 'Solicitud de intercambio rechazada.',
                    'request' => $this->formatRotationRequest(
                        $rotationRequest
                    ),
                ];
            }

            $this->getAuthorizedExam(
                $examId,
                (int) $requesterAssignment->user_id
            );

            abort_if(
                $requesterAssignment->ended_at !== null
                    || $receiverAssignment->ended_at !== null,
                409,
                'Las asignaciones originales ya no están activas.'
            );

            $requesterPoint = ControlPoint::whereKey(
                $requesterAssignment->control_point_id
            )
                ->where('exam_id', $examId)
                ->where('is_active', true)
                ->firstOrFail();

            $receiverPoint = ControlPoint::whereKey(
                $receiverAssignment->control_point_id
            )
                ->where('exam_id', $examId)
                ->where('is_active', true)
                ->firstOrFail();

            abort_if(
                (int) $requesterPoint->id === (int) $receiverPoint->id,
                409,
                'Los puntos de control deben ser diferentes.'
            );

            $rotationTime = now();

            $requesterAssignment->update([
                'ended_at' => $rotationTime,
            ]);

            $receiverAssignment->update([
                'ended_at' => $rotationTime,
            ]);

            $newRequesterAssignment = ControlPointAssignment::create([
                'control_point_id' => $receiverPoint->id,
                'user_id' => $requesterAssignment->user_id,
                'started_at' => $rotationTime,
                'ended_at' => null,
            ]);

            $newReceiverAssignment = ControlPointAssignment::create([
                'control_point_id' => $requesterPoint->id,
                'user_id' => $receiverAssignment->user_id,
                'started_at' => $rotationTime,
                'ended_at' => null,
            ]);

            $rotationRequest->update([
                'status' => ControlPointRotationRequest::ACCEPTED,
                'responded_at' => $rotationTime,
            ]);

            return [
                'message' => 'Intercambio de puntos de control realizado correctamente.',
                'request' => $this->formatRotationRequest(
                    $rotationRequest
                ),
                'requester_assignment' => $newRequesterAssignment
                    ->load('controlPoint.room'),
                'receiver_assignment' => $newReceiverAssignment
                    ->load('controlPoint.room'),
            ];
        });
    }

    public function getRotationRequests(
        int $examId,
        int $userId
    ): array {
        $this->getAuthorizedExam($examId, $userId);

        return ControlPointRotationRequest::whereHas(
            'requesterAssignment.controlPoint',
            fn ($query) => $query->where('exam_id', $examId)
        )
            ->whereHas(
                'receiverAssignment.controlPoint',
                fn ($query) => $query->where('exam_id', $examId)
            )
            ->where(function ($query) use ($userId) {
                $query->whereHas(
                    'requesterAssignment',
                    fn ($assignmentQuery) => $assignmentQuery
                        ->where('user_id', $userId)
                )->orWhereHas(
                    'receiverAssignment',
                    fn ($assignmentQuery) => $assignmentQuery
                        ->where('user_id', $userId)
                );
            })
            ->with([
                'requesterAssignment.user',
                'requesterAssignment.controlPoint.room',
                'receiverAssignment.user',
                'receiverAssignment.controlPoint.room',
            ])
            ->orderByDesc('id')
            ->get()
            ->map(function (
                ControlPointRotationRequest $rotationRequest
            ) use ($userId) {
                $data = $this->formatRotationRequest(
                    $rotationRequest
                );

                $data['direction'] =
                    (int) $rotationRequest->requesterAssignment->user_id
                        === $userId
                        ? 'OUTGOING'
                        : 'INCOMING';

                return $data;
            })
            ->values()
            ->all();
    }

    private function formatRotationRequest(
        ControlPointRotationRequest $rotationRequest
    ): array {
        $rotationRequest->loadMissing([
            'requesterAssignment.user',
            'requesterAssignment.controlPoint.room',
            'receiverAssignment.user',
            'receiverAssignment.controlPoint.room',
        ]);

        return [
            'id' => $rotationRequest->id,
            'status' => $rotationRequest->status,
            'created_at' => $rotationRequest->created_at,
            'responded_at' => $rotationRequest->responded_at,
            'requester' => $this->formatRotationAssignment(
                $rotationRequest->requesterAssignment
            ),
            'receiver' => $this->formatRotationAssignment(
                $rotationRequest->receiverAssignment
            ),
        ];
    }

    private function formatRotationAssignment(
        ControlPointAssignment $assignment
    ): array {
        return [
            'assignment_id' => $assignment->id,
            'user_id' => $assignment->user_id,
            'name' => $assignment->user?->nombre,
            'control_point_id' => $assignment->control_point_id,
            'room_id' => $assignment->controlPoint->room_id,
            'room_name' => $assignment->controlPoint->room?->nombre,
            'control_type' => $assignment->controlPoint->control_type,
            'started_at' => $assignment->started_at,
            'ended_at' => $assignment->ended_at,
        ];
    }

    public function getHistory(
        int $examId,
        int $userId
    ): array {
        $this->getAuthorizedExam($examId, $userId);

        return ControlPointAssignment::whereHas(
            'controlPoint',
            fn ($query) => $query->where('exam_id', $examId)
        )
            ->with([
                'controlPoint.room',
                'user',
            ])
            ->orderByDesc('started_at')
            ->get()
            ->map(fn ($assignment) => [
                'id' => $assignment->id,
                'user_id' => $assignment->user_id,
                'responsible_name' => $assignment->user?->nombre,
                'control_point_id' => $assignment->control_point_id,
                'room_id' => $assignment->controlPoint->room_id,
                'room_name' => $assignment->controlPoint->room?->nombre,
                'control_type' => $assignment->controlPoint->control_type,
                'started_at' => $assignment->started_at,
                'ended_at' => $assignment->ended_at,
            ])
            ->values()
            ->all();
    }

    public function hasActiveAccess(
        int $examId,
        int $roomId,
        int $userId,
        string $controlType
    ): bool {
        if (!$this->isAuthorized($examId, $userId)) {
            return false;
        }

        $exam = Exam::find($examId);

        if (!$exam || !$exam->activo) {
            return false;
        }

        $endDateTime = Carbon::parse(
            $exam->fecha->format('Y-m-d')
            . ' '
            . $exam->hora_fin
        );

        if (now()->greaterThanOrEqualTo($endDateTime)) {
            return false;
        }

        return $this->activeAssignmentQuery($examId, $userId)
            ->whereHas('controlPoint', function ($query) use (
                $roomId,
                $controlType
            ) {
                $query->where('room_id', $roomId)
                    ->where('control_type', $controlType)
                    ->where('is_active', true);
            })
            ->exists();
    }
}