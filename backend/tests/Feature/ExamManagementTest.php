<?php

namespace Tests\Feature;

use App\Models\Aula;
use App\Models\Examen;
use App\Models\Materia;
use App\Models\MateriaGrupo;
use App\Models\TipoExamen;
use App\Models\Usuario;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;
use Tests\TestCase;

class ExamManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    private function createCourseGroup(): MateriaGrupo
    {
        $emailId = \App\Models\EmailDomain::where('dominio', '@umss.edu.bo')->value('id');

        $teacher = Usuario::create([
            'nombre' => 'Docente Titular',
            'email' => 'docente@umss.edu.bo',
            'ci' => '123456',
            'contrasena' => bcrypt('password123'),
            'activo' => true,
            'email_id' => $emailId,
        ]);

        // Use existing materia from seeder to avoid unique constraint violation
        $materia = Materia::where('sigla', 'INF110')->first();

        return MateriaGrupo::create([
            'materia_id' => $materia->id,
            'grupo' => '1',
            'gestion' => '2/2026',
            'docente_id' => $teacher->id,
            'activo' => true,
        ]);
    }

    private function getAuthHeaders(Usuario $user): array
    {
        $token = JWTAuth::fromUser($user);
        return ['Authorization' => 'Bearer ' . $token];
    }

    public function test_can_get_empty_exams_list_when_no_exams_scheduled(): void
    {
        $courseGroup = $this->createCourseGroup();
        $headers = $this->getAuthHeaders($courseGroup->docente);

        $response = $this->withHeaders($headers)->getJson("/api/courses/{$courseGroup->id}/exams");

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [],
                'message' => 'Exámenes del curso obtenidos exitosamente.',
            ]);
    }

    public function test_can_schedule_exam_for_a_course_via_api(): void
    {
        $courseGroup = $this->createCourseGroup();
        $headers = $this->getAuthHeaders($courseGroup->docente);

        $payload = [
            'tipo_examen' => 'PRIMER PARCIAL',
            'fecha' => '2026-10-15',
            'hora_inicio' => '08:15 am',
            'hora_fin' => '09:45 am',
            'aulas' => ['Aula 691A', 'Aula 691B'],
            'normas' => ['Carnet de identidad obligatorio', 'Sin calculadora programable'],
        ];

        $response = $this->withHeaders($headers)->postJson("/api/courses/{$courseGroup->id}/exams", $payload);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'message' => 'Examen programado correctamente',
            ]);

        $this->assertDatabaseHas('tipo_examen', [
            'nombre' => 'PRIMER PARCIAL',
        ]);

        $this->assertDatabaseHas('examen', [
            'materia_grupo_id' => $courseGroup->id,
            'hora_inicio' => '08:15 am',
            'hora_fin' => '09:45',
        ]);

        $createdExam = Examen::where('materia_grupo_id', $courseGroup->id)->first();
        $this->assertNotNull($createdExam);
        $this->assertEquals('2026-10-15', date('Y-m-d', strtotime((string)$createdExam->fecha)));
        $this->assertTrue((bool)$createdExam->activo);

        $this->assertDatabaseHas('aula', ['nombre' => 'Aula 691A']);
        $this->assertDatabaseHas('aula', ['nombre' => 'Aula 691B']);
        $this->assertDatabaseHas('examen_norma', ['descripcion' => 'Carnet de identidad obligatorio']);
        $this->assertDatabaseHas('examen_norma', ['descripcion' => 'Sin calculadora programable']);
    }

    public function test_can_list_scheduled_exams_after_creation(): void
    {
        $courseGroup = $this->createCourseGroup();
        $headers = $this->getAuthHeaders($courseGroup->docente);

        $payload = [
            'tipo_examen' => 'SEGUNDO PARCIAL',
            'fecha' => '2026-11-20',
            'hora_inicio' => '06:45 pm',
            'hora_fin' => '08:15 pm',
            'aulas' => ['Auditorio'],
            'normas' => ['Estudiantes deben apagar sus celulares'],
        ];

        $this->withHeaders($headers)->postJson("/api/courses/{$courseGroup->id}/exams", $payload)
            ->assertStatus(201);

        $response = $this->withHeaders($headers)->getJson("/api/courses/{$courseGroup->id}/exams");

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ]);

        $response->assertJsonFragment([
            'exam_type' => 'SEGUNDO PARCIAL',
            'date' => '2026-11-20',
        ]);
    }

    public function test_cannot_schedule_exam_with_invalid_course(): void
    {
        $courseGroup = $this->createCourseGroup();
        $headers = $this->getAuthHeaders($courseGroup->docente);

        $payload = [
            'tipo_examen' => 'EXAMEN FINAL',
            'fecha' => '2026-12-15',
            'hora_inicio' => '08:15 am',
            'hora_fin' => '09:45 am',
            'aulas' => ['Aula 691A'], // Use valid room from seeder
            'normas' => [],
        ];

        $response = $this->withHeaders($headers)->postJson('/api/courses/99999/exams', $payload);

        $response->assertStatus(400)
            ->assertJson([
                'success' => false,
                'message' => 'Error al programar el examen: El grupo de materia con ID 99999 no existe.',
            ]);
    }

    public function test_cannot_schedule_exam_with_missing_fields(): void
    {
        $courseGroup = $this->createCourseGroup();
        $headers = $this->getAuthHeaders($courseGroup->docente);

        $response = $this->withHeaders($headers)->postJson("/api/courses/{$courseGroup->id}/exams", []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['title', 'date', 'start_time', 'end_time']);
    }
}
