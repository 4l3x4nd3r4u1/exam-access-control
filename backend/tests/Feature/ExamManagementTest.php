<?php

namespace Tests\Feature;

use App\Models\Aula;
use App\Models\Examen;
use App\Models\Materia;
use App\Models\MateriaGrupo;
use App\Models\TipoExamen;
use App\Models\Usuario;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExamManagementTest extends TestCase
{
    use RefreshDatabase;

    private function createCourseGroup(): MateriaGrupo
    {
        $teacher = Usuario::create([
            'nombre' => 'Docente Titular',
            'email' => 'docente@umss.edu.bo',
            'ci' => '123456',
            'contrasena' => bcrypt('password123'),
            'activo' => true,
        ]);

        $materia = Materia::create([
            'sigla' => 'INF110',
            'nombre' => 'Introducción a la Programación',
            'activo' => true,
        ]);

        return MateriaGrupo::create([
            'materia_id' => $materia->id,
            'grupo' => '1',
            'gestion' => '2/2026',
            'docente_id' => $teacher->id,
            'activo' => true,
        ]);
    }

    public function test_can_get_empty_exams_list_when_no_exams_scheduled(): void
    {
        $courseGroup = $this->createCourseGroup();

        $response = $this->getJson("/api/courses/{$courseGroup->id}/exams");

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

        $payload = [
            'tipo_examen' => 'Primer Parcial',
            'fecha' => '2026-10-15',
            'hora_inicio' => '08:15 am',
            'hora_fin' => '09:45 am',
            'aulas' => ['691A', '691B'],
            'normas' => ['Carnet de identidad obligatorio', 'Sin calculadora programable'],
        ];

        $response = $this->postJson("/api/courses/{$courseGroup->id}/exams", $payload);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'message' => 'Examen programado exitosamente.',
            ]);

        $this->assertDatabaseHas('tipo_examen', [
            'nombre' => 'Primer Parcial',
        ]);

        $this->assertDatabaseHas('examen', [
            'materia_grupo_id' => $courseGroup->id,
            'hora_inicio' => '08:15:00',
            'hora_fin' => '09:45:00',
        ]);

        $createdExam = Examen::where('materia_grupo_id', $courseGroup->id)->first();
        $this->assertNotNull($createdExam);
        $this->assertEquals('2026-10-15', date('Y-m-d', strtotime((string)$createdExam->fecha)));
        $this->assertTrue((bool)$createdExam->activo);

        $this->assertDatabaseHas('aula', ['nombre' => '691A']);
        $this->assertDatabaseHas('aula', ['nombre' => '691B']);
        $this->assertDatabaseHas('examen_norma', ['descripcion' => 'Carnet de identidad obligatorio']);
        $this->assertDatabaseHas('examen_norma', ['descripcion' => 'Sin calculadora programable']);
    }

    public function test_can_list_scheduled_exams_after_creation(): void
    {
        $courseGroup = $this->createCourseGroup();

        $payload = [
            'tipo_examen' => 'Segundo Parcial',
            'fecha' => '2026-11-20',
            'hora_inicio' => '06:45 pm',
            'hora_fin' => '08:15 pm',
            'aulas' => ['Auditorio'],
            'normas' => ['Estudiantes deben apagar sus celulares'],
        ];

        $this->postJson("/api/courses/{$courseGroup->id}/exams", $payload)
            ->assertStatus(201);

        $response = $this->getJson("/api/courses/{$courseGroup->id}/exams");

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ]);

        $response->assertJsonFragment([
            'title' => 'Segundo Parcial',
            'date' => '20/11/2026',
            'start_time' => '18:45',
            'end_time' => '20:15',
            'aulas' => ['Auditorio'],
            'normas' => ['Estudiantes deben apagar sus celulares'],
        ]);
    }

    public function test_cannot_schedule_exam_with_invalid_course(): void
    {
        $payload = [
            'tipo_examen' => 'Examen Final',
            'fecha' => '2026-12-15',
            'hora_inicio' => '08:15 am',
            'hora_fin' => '09:45 am',
            'aulas' => ['691C'],
            'normas' => [],
        ];

        $response = $this->postJson('/api/courses/99999/exams', $payload);

        $response->assertStatus(400)
            ->assertJson([
                'success' => false,
                'message' => 'El grupo de materia especificado no existe.',
            ]);
    }

    public function test_cannot_schedule_exam_with_missing_fields(): void
    {
        $courseGroup = $this->createCourseGroup();

        $response = $this->postJson("/api/courses/{$courseGroup->id}/exams", []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['title', 'date', 'start_time', 'end_time']);
    }
}
