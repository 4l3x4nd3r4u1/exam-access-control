<?php

namespace App\Services;

use App\Mail\ExamTeacherInvitationMail;
use App\Models\Exam;
use App\Models\ExamInvitation;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;
use Throwable;

class ExamInvitationService
{
    public function invite(
        Exam $exam,
        User $inviter,
        int $invitedTeacherId,
        string $message
    ): ExamInvitation {
        $exam->loadMissing(['courseGroup.course', 'examType', 'rooms']);

        $isResponsible = (int) $exam->courseGroup?->docente_id === (int) $inviter->id;
        if (!$isResponsible && !$inviter->hasRole('ADMIN')) {
            throw new AuthorizationException(
                'Sólo el docente responsable o un administrador puede invitar docentes a este examen.'
            );
        }

        if ((int) $inviter->id === $invitedTeacherId) {
            throw ValidationException::withMessages([
                'invitedTeacherId' => 'No puedes invitarte a ti mismo.',
            ]);
        }

        $invitedTeacher = User::query()
            ->whereKey($invitedTeacherId)
            ->where('activo', true)
            ->first();

        if (!$invitedTeacher || !$invitedTeacher->hasRole('DOCENTE')) {
            throw ValidationException::withMessages([
                'invitedTeacherId' => 'El usuario seleccionado no es un docente activo.',
            ]);
        }

        $invitation = DB::transaction(function () use (
            $exam,
            $inviter,
            $invitedTeacher,
            $message
        ): ExamInvitation {
            $invitation = ExamInvitation::query()
                ->where('examen_id', $exam->id)
                ->where('docente_invitado_id', $invitedTeacher->id)
                ->first();

            if ($invitation?->correo_estado === ExamInvitation::MAIL_SENT) {
                throw ValidationException::withMessages([
                    'invitedTeacherId' => 'Este docente ya fue invitado al examen.',
                ]);
            }

            $invitation ??= new ExamInvitation([
                'examen_id' => $exam->id,
                'docente_invitado_id' => $invitedTeacher->id,
            ]);

            $invitation->fill([
                'docente_invitador_id' => $inviter->id,
                'mensaje' => trim($message),
                'correo_estado' => ExamInvitation::MAIL_PENDING,
                'correo_enviado_en' => null,
            ])->save();

            DB::table('registro_auditoria')->insert([
                'usuario_id' => $inviter->id,
                'accion' => 'INVITAR_DOCENTE_EXAMEN',
                'entidad_tipo' => 'examen_invitacion',
                'entidad_id' => $invitation->id,
                'detalles' => json_encode([
                    'examen_id' => $exam->id,
                    'docente_invitado_id' => $invitedTeacher->id,
                ]),
                'fecha' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return $invitation;
        });

        $invitation->load([
            'exam.courseGroup.course',
            'exam.examType',
            'exam.rooms',
            'invitedTeacher',
            'inviter',
        ]);

        try {
            Mail::to($invitedTeacher->email)
                ->send(new ExamTeacherInvitationMail($invitation));

            $invitation->update([
                'correo_estado' => ExamInvitation::MAIL_SENT,
                'correo_enviado_en' => now(),
            ]);
        } catch (Throwable $exception) {
            $invitation->update([
                'correo_estado' => ExamInvitation::MAIL_FAILED,
                'correo_enviado_en' => null,
            ]);

            Log::error('No se pudo enviar la invitación docente por correo.', [
                'invitation_id' => $invitation->id,
                'error' => $exception->getMessage(),
            ]);
        }

        return $invitation->refresh()->load([
            'exam.courseGroup.course',
            'exam.examType',
            'exam.rooms',
            'invitedTeacher',
            'inviter',
        ]);
    }
}
