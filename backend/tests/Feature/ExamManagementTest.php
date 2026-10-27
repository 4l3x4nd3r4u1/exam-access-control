<?php

namespace Tests\Feature;

use App\Models\Aula;
use App\Models\Examen;
use App\Models\EnrollmentStatus;
use App\Models\Estudiante;
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

        $courseGroup = MateriaGrupo::create([
            'materia_id' => $materia->id,
            'grupo' => '1',
            'gestion' => '2/2026',
            'docente_id' => $teacher->id,
            'activo' => true,
        ]);

        // Create enrolled students for testing
        $this->createEnrolledStudents($courseGroup);

        return $courseGroup;
    }

    private function createEnrolledStudents(MateriaGrupo $courseGroup): array
    {
        $enrollmentStatus = EnrollmentStatus::where('nombre', 'HABILITADO')->first();
        $students = [];

        for ($i = 1; $i <= 6; $i++) {
            $user = Usuario::create([
                'nombre' => "Estudiante Test {$i}",
                'email' => "estudiante{$i}@umss.edu.bo",
                'ci' => "9000000{$i}",
                'contrasena' => bcrypt('password123'),
                'activo' => true,
                'email_id' => \App\Models\EmailDomain::where('dominio', '@umss.edu.bo')->value('id'),
            ]);

            Estudiante::create([
                'codigo_sis' => 202600000 + $i,
                'usuario_id' => $user->id,
            ]);

            \App\Models\Inscripcion::create([
                'usuario_id' => $user->id,
                'materia_grupo_id' => $courseGroup->id,
                'estado_inscripcion_id' => $enrollmentStatus->id,
                'fecha_inscripcion' => now(),
            ]);

            $students[] = $user;
        }

        return $students;
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
                'message' => 'Exámenes obtenidos exitosamente.',
            ]);
    }

    public function test_can_schedule_exam_for_a_course_via_api(): void
    {
        $courseGroup = $this->createCourseGroup();
        $headers = $this->getAuthHeaders($courseGroup->docente);

        // Get enrolled student IDs
        $studentIds = \App\Models\Inscripcion::where('materia_grupo_id', $courseGroup->id)
            ->pluck('usuario_id')
            ->toArray();

        // Get exam type ID and room IDs from seeded data
        $examType = TipoExamen::where('nombre', 'PRIMER PARCIAL')->first();
        $room1 = Aula::where('nombre', 'Aula 691A')->first();
        $room2 = Aula::where('nombre', 'Aula 691B')->first();

        // Use first 3 students for room 1, next 3 for room 2
        $room1Students = array_slice($studentIds, 0, 3);
        $room2Students = array_slice($studentIds, 3, 3);

        $payload = [
            'examTypeId' => $examType->id,
            'date' => '2026-10-15',
            'startTime' => '08:15',
            'rooms' => [
                ['roomId' => $room1->id, 'students' => $room1Students, 'auxiliarId' => null],
                ['roomId' => $room2->id, 'students' => $room2Students, 'auxiliarId' => null],
            ],
            'generalRules' => ['Carnet de identidad obligatorio', 'Sin calculadora programable'],
            'studentRules' => [
                ['studentId' => $room1Students[0], 'rule' => 'Tiempo extra 30 min'],
            ],
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
            'hora_inicio' => '08:15',
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

        // Get enrolled student IDs
        $studentIds = \App\Models\Inscripcion::where('materia_grupo_id', $courseGroup->id)
            ->pluck('usuario_id')
            ->toArray();

        $examType = TipoExamen::where('nombre', 'SEGUNDO PARCIAL')->first();
        $room = Aula::where('nombre', 'Auditorio')->first();

        $payload = [
            'examTypeId' => $examType->id,
            'date' => '2026-11-20',
            'startTime' => '18:45',
            'rooms' => [
                ['roomId' => $room->id, 'students' => array_slice($studentIds, 0, 2), 'auxiliarId' => null],
            ],
            'generalRules' => ['Estudiantes deben apagar sus celulares'],
            'studentRules' => [],
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

        $examType = TipoExamen::where('nombre', 'EXAMEN FINAL')->first();
        $room = Aula::where('nombre', 'Aula 691A')->first();

        $payload = [
            'examTypeId' => $examType->id,
            'date' => '2026-12-15',
            'startTime' => '08:15',
            'rooms' => [
                ['roomId' => $room->id, 'students' => [], 'auxiliarId' => null],
            ],
            'generalRules' => [],
            'studentRules' => [],
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

        $response->assertStatus(422);
    }
}