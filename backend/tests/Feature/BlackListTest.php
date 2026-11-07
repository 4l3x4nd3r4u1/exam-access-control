<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Student;
use App\Models\CourseGroup;
use App\Models\EnrollmentStatus;
use App\Models\EmailDomain;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;

class BlackListTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    protected function getAuthHeaders(): array
    {
        $user = User::where('email', 'ana.morales@umss.edu.bo')->first();
        $token = JWTAuth::fromUser($user);

        return [
            'Authorization' => 'Bearer ' . $token,
            'Content-Type' => 'application/json',
        ];
    }

    private function createStatusScenario(): array
    {
        $teacher = User::where('email', 'ana.morales@umss.edu.bo')->first();

        $course = DB::table('materia')->where('sigla', 'INF110')->first();
        $emailId = EmailDomain::where('dominio', '@est.umss.edu')->value('id');

        $courseGroup = CourseGroup::create([
            'materia_id' => $course->id,
            'grupo' => 'HU30',
            'gestion' => '2026-HU30',
            'docente_id' => $teacher->id,
            'activo' => true,
        ]);

        $studentUser = User::create([
            'nombre' => 'Estudiante HU30',
            'email' => 'estudiante.hu30@umss.edu',
            'email_id' => $emailId,
            'contrasena' => bcrypt('password123'),
            'ci' => '88888888',
            'activo' => true,
        ]);

        Student::create([
            'codigo_sis' => 202630001,
            'usuario_id' => $studentUser->id,
        ]);

        DB::table('inscripcion')->insert([
            'usuario_id' => $studentUser->id,
            'materia_grupo_id' => $courseGroup->id,
            'estado_inscripcion_id' => EnrollmentStatus::where('nombre', 'HABILITADO')->value('id'),
            'fecha_inscripcion' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return [$studentUser, $courseGroup];
    }

    private function updateStudentStatus($student, $courseGroup, $status, $reason = null): void
    {
        $this->withHeaders($this->getAuthHeaders())
            ->putJson("/api/courses/{$courseGroup->id}/students/{$student->id}/status", [
                'status' => $status,
                'reason' => $reason,
            ])->assertStatus(200);
    }

    public function test_blacklist_requires_authentication()
    {
        $this->getJson('/api/blacklist')->assertStatus(401);

        $this->getJson('/api/blacklist/1')->assertStatus(401);
    }

    public function test_blacklist_lists_ineligible_students()
    {
        [$student, $courseGroup] = $this->createStatusScenario();

        $this->updateStudentStatus(
            $student,
            $courseGroup,
            'INHABILITADO',
            'Motivo de prueba HU30'
        );

        $this->withHeaders($this->getAuthHeaders())
            ->getJson('/api/blacklist')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonFragment([
                'user_id' => $student->id,
                'nombre' => 'Estudiante HU30',
                'codigo_sis' => 202630001,
                'ci' => '88888888',
                'total_inhabilitaciones' => 1,
            ]);
    }

    public function test_blacklist_searches_by_name_sis_and_ci()
    {
        [$student, $courseGroup] = $this->createStatusScenario();

        $this->updateStudentStatus(
            $student,
            $courseGroup,
            'INHABILITADO',
            'Motivo de prueba HU30'
        );

        $headers = $this->getAuthHeaders();

        $this->withHeaders($headers)
            ->getJson('/api/blacklist?search=Estudiante')
            ->assertOk()
            ->assertJsonFragment(['codigo_sis' => 202630001]);

        $this->withHeaders($headers)
            ->getJson('/api/blacklist?search=202630001')
            ->assertOk()
            ->assertJsonFragment(['codigo_sis' => 202630001]);

        $this->withHeaders($headers)
            ->getJson('/api/blacklist?search=88888888')
            ->assertOk()
            ->assertJsonFragment(['ci' => '88888888']);
    }

    public function test_blacklist_rejects_invalid_search_characters()
    {
        $this->withHeaders($this->getAuthHeaders())
            ->getJson('/api/blacklist?search=Juan123')
            ->assertStatus(422);

        $this->withHeaders($this->getAuthHeaders())
            ->getJson('/api/blacklist?search=123-456')
            ->assertStatus(422);
    }

    public function test_blacklist_shows_all_student_inhabilitation_records()
    {
        [$student, $courseGroup] = $this->createStatusScenario();

        $this->updateStudentStatus(
            $student,
            $courseGroup,
            'INHABILITADO',
            'Primera inhabilitación'
        );

        $this->updateStudentStatus(
            $student,
            $courseGroup,
            'HABILITADO'
        );

        $this->updateStudentStatus(
            $student,
            $courseGroup,
            'INHABILITADO',
            'Segunda inhabilitación'
        );

        $this->withHeaders($this->getAuthHeaders())
            ->getJson("/api/blacklist/{$student->id}")
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.total_inhabilitaciones', 2)
            ->assertJsonFragment([
                'motivo' => 'Primera inhabilitación',
            ])
            ->assertJsonFragment([
                'motivo' => 'Segunda inhabilitación',
            ]);
    }

    public function test_blacklist_returns_404_for_student_without_history()
    {
        [$student] = $this->createStatusScenario();

        $this->withHeaders($this->getAuthHeaders())
            ->getJson("/api/blacklist/{$student->id}")
            ->assertStatus(404);
    }

    public function test_student_inhabilitated_by_different_teachers_appears_once_with_all_records()
    {
        [$student, $firstCourseGroup] = $this->createStatusScenario();

        $secondTeacher = User::where('email', 'carlos.mendoza@umss.edu.bo')->first();
        $secondCourse = DB::table('materia')->where('sigla', 'INF210')->first();

        $secondCourseGroup = CourseGroup::create([
            'materia_id' => $secondCourse->id,
            'grupo' => 'HU30-B',
            'gestion' => '2026-HU30',
            'docente_id' => $secondTeacher->id,
            'activo' => true,
        ]);

        DB::table('inscripcion')->insert([
            'usuario_id' => $student->id,
            'materia_grupo_id' => $secondCourseGroup->id,
            'estado_inscripcion_id' => EnrollmentStatus::where('nombre', 'HABILITADO')->value('id'),
            'fecha_inscripcion' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Primera inhabilitación por el primer docente.
        $this->updateStudentStatus(
            $student,
            $firstCourseGroup,
            'INHABILITADO',
            'Inhabilitación en primera materia'
        );

        // Segunda inhabilitación por otro docente y materia.
        $this->updateStudentStatus(
            $student,
            $secondCourseGroup,
            'INHABILITADO',
            'Inhabilitación en segunda materia'
        );

        // El estudiante debe aparecer una sola vez.
        $this->withHeaders($this->getAuthHeaders())
            ->getJson('/api/blacklist')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.total_inhabilitaciones', 2);

        // El detalle debe conservar ambos antecedentes.
        $this->withHeaders($this->getAuthHeaders())
            ->getJson("/api/blacklist/{$student->id}")
            ->assertOk()
            ->assertJsonPath('data.total_inhabilitaciones', 2)
            ->assertJsonFragment([
                'materia' => 'INF110',
                'motivo' => 'Inhabilitación en primera materia',
            ])
            ->assertJsonFragment([
                'materia' => 'INF210',
                'motivo' => 'Inhabilitación en segunda materia',
            ]);
    }
}
