<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreExamInvitationRequest;
use App\Models\Exam;
use App\Models\ExamInvitation;
use App\Services\ExamInvitationService;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Throwable;

class ExamInvitationController extends Controller
{
    public function __construct(
        private readonly ExamInvitationService $service
    ) {}

    public function store(
        StoreExamInvitationRequest $request,
        Exam $exam
    ): JsonResponse {
        try {
            $invitation = $this->service->invite(
                $exam,
                $request->user(),
                (int) $request->validated('invited_teacher_id'),
                (string) $request->validated('message'),
            );

            $mailSent = $invitation->correo_estado === ExamInvitation::MAIL_SENT;

            return response()->json([
                'success' => true,
                'data' => [
                    'invitation_id' => $invitation->id,
                    'mail_sent' => $mailSent,
                    'mail_status' => $invitation->correo_estado,
                    'invited_teacher' => [
                        'user_id' => $invitation->invitedTeacher->id,
                        'full_name' => $invitation->invitedTeacher->nombre,
                        'email' => $invitation->invitedTeacher->email,
                    ],
                ],
                'message' => $mailSent
                    ? 'Invitación enviada correctamente.'
                    : 'La invitación fue registrada, pero el correo no pudo enviarse.',
            ], 201);
        } catch (AuthorizationException $exception) {
            return response()->json([
                'success' => false,
                'message' => $exception->getMessage(),
            ], 403);
        } catch (Throwable $exception) {
            Log::error('No se pudo registrar la invitación docente.', [
                'exam_id' => $exam->id,
                'error' => $exception->getMessage(),
            ]);

            throw $exception;
        }
    }
}
