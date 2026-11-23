<?php

namespace Tests\Feature;

use App\Mail\ExamTeacherInvitationMail;
use App\Models\Course;
use App\Models\CourseGroup;
use App\Models\Exam;
use App\Models\ExamType;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;
use Tests\TestCase;

class ExamInvitationTest extends TestCase
{
    use RefreshDatabase;

    private User $owner;
    private User $invitee;
    private User $otherTeacher;
    private CourseGroup $courseGroup;
    private Exam $exam;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();

        $this->owner = User::where('email', 'ana.morales@umss.edu.bo')->firstOrFail();
        $this->invitee = User::where('email', 'juan.perez@umss.edu.bo')->firstOrFail();
        $this->otherTeacher = User::where('email', 'carlos.mendoza@umss.edu.bo')->firstOrFail();

        $this->courseGroup = CourseGroup::create([
            'materia_id' => Course::firstOrFail()->id,
            'grupo' => 'INV-1',
            'gestion' => '2/2026',
            'docente_id' => $this->owner->id,
            'activo' => true,
        ]);

        $this->exam = Exam::create([
            'materia_grupo_id' => $this->courseGroup->id,
            'tipo_examen_id' => ExamType::firstOrFail()->id,
            'fecha' => now('America/La_Paz')->addDays(5)->format('Y-m-d'),
            'hora_inicio' => '09:00',
            'hora_fin' => '10:30',
            'activo' => true,
        ]);
    }

    private function headersFor(User $user): array
    {
        return [
            'Authorization' => 'Bearer ' . JWTAuth::fromUser($user),
            'Content-Type' => 'application/json',
        ];
    }

    public function test_responsible_teacher_can_invite_and_email_contains_custom_message(): void
    {
        Mail::fake();

        $message = 'Te invito a colaborar en el control y revisión del examen.';

        $response = $this->withHeaders($this->headersFor($this->owner))
            ->postJson("/api/exams/{$this->exam->id}/invitations", [
                'invitedTeacherId' => $this->invitee->id,
                'message' => $message,
            ]);

        $response->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.mail_sent', true)
            ->assertJsonPath('data.invited_teacher.email', $this->invitee->email);

        $this->assertDatabaseHas('examen_invitacion', [
            'examen_id' => $this->exam->id,
            'docente_invitado_id' => $this->invitee->id,
            'docente_invitador_id' => $this->owner->id,
            'mensaje' => $message,
            'correo_estado' => 'ENVIADO',
        ]);

        Mail::assertSent(
            ExamTeacherInvitationMail::class,
            function (ExamTeacherInvitationMail $mail) use ($message): bool {
                $mail->assertSeeInHtml($message);
                $mail->assertSeeInHtml('No necesitas aceptar la invitación.');

                return $mail->hasTo($this->invitee->email)
                    && $mail->invitation->mensaje === $message;
            }
        );
    }

    public function test_invited_teacher_gets_immediate_exam_access_without_accepting(): void
    {
        Mail::fake();

        $this->withHeaders($this->headersFor($this->owner))
            ->postJson("/api/exams/{$this->exam->id}/invitations", [
                'invitedTeacherId' => $this->invitee->id,
                'message' => 'Participa en este examen, por favor.',
            ])
            ->assertCreated();

        $inviteeHeaders = $this->headersFor($this->invitee);

        $this->withHeaders($inviteeHeaders)
            ->getJson("/api/teachers/{$this->invitee->id}/courses")
            ->assertOk()
            ->assertJsonFragment([
                'course_group_id' => (string) $this->courseGroup->id,
                'can_interact' => true,
            ]);

        $this->withHeaders($inviteeHeaders)
            ->getJson("/api/courses/{$this->courseGroup->id}/exams")
            ->assertOk()
            ->assertJsonFragment([
                'exam_id' => (string) $this->exam->id,
            ]);

        $this->withHeaders($this->headersFor($this->otherTeacher))
            ->getJson("/api/courses/{$this->courseGroup->id}/exams")
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_invitation_cannot_be_duplicated(): void
    {
        Mail::fake();
        $payload = [
            'invitedTeacherId' => $this->invitee->id,
            'message' => 'Invitación de prueba.',
        ];

        $this->withHeaders($this->headersFor($this->owner))
            ->postJson("/api/exams/{$this->exam->id}/invitations", $payload)
            ->assertCreated();

        $this->withHeaders($this->headersFor($this->owner))
            ->postJson("/api/exams/{$this->exam->id}/invitations", $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors('invitedTeacherId');

        Mail::assertSentCount(1);
    }

    public function test_teacher_cannot_invite_to_an_exam_they_do_not_manage(): void
    {
        Mail::fake();

        $this->withHeaders($this->headersFor($this->otherTeacher))
            ->postJson("/api/exams/{$this->exam->id}/invitations", [
                'invitedTeacherId' => $this->invitee->id,
                'message' => 'Invitación no autorizada.',
            ])
            ->assertForbidden();

        Mail::assertNothingSent();
    }

    public function test_teacher_cannot_invite_themselves(): void
    {
        Mail::fake();

        $this->withHeaders($this->headersFor($this->owner))
            ->postJson("/api/exams/{$this->exam->id}/invitations", [
                'invitedTeacherId' => $this->owner->id,
                'message' => 'Invitación inválida.',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('invitedTeacherId');

        Mail::assertNothingSent();
    }
}
