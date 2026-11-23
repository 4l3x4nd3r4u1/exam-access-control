<?php

namespace App\Mail;

use App\Models\ExamInvitation;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ExamTeacherInvitationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly ExamInvitation $invitation
    ) {}

    public function envelope(): Envelope
    {
        $subject = $this->invitation->exam->courseGroup?->course?->nombre
            ?? 'examen programado';

        return new Envelope(
            subject: "Invitación docente: {$subject}"
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'mail.exam-teacher-invitation',
            with: [
                'frontendUrl' => config('mail.frontend_url'),
            ],
        );
    }
}
