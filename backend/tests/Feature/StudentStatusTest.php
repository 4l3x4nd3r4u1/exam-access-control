<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\CourseGroup;
use App\Models\StudentCourseEnrollment;
use App\Models\EnrollmentStatus;
use App\Models\ExamStudentStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;
use App\Models\Student;
use App\Models\EmailDomain;
use Illuminate\Support\Facades\DB;

class StudentStatusTest extends TestCase
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
        $enabledStatus = EnrollmentStatus::where('nombre', 'HABILITADO')->first();

        $courseGroup = CourseGroup::create([
            'materia_id' => $course->id,
            'grupo' => 'HU30',
            'gestion' => '2026-HU30',
            'docente_id' => $teacher->id,
            'activo' => true,
        ]);

        $emailId = EmailDomain::where('dominio', '@est.umss.edu')->value('id');

        $studentUser = User::create([
            'nombre' => 'Estudiante HU30',
            'email' => 'estudiante.hu30@est.umss.edu',
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
            'estado_inscripcion_id' => $enabledStatus->id,
            'fecha_inscripcion' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return [$teacher, $studentUser, $courseGroup];
    }

    public function test_update_status_requires_auth()
    {
        $response = $this->putJson('/api/courses/1/students/10/status', [
            'status' => 'INHABILITADO',
            'reason' => 'Test reason',
        ]);
        $response->assertStatus(401);
    }

    public function test_update_status_inhabilitado_requires_reason()
    {
        $response = $this->withHeaders($this->getAuthHeaders())
            ->putJson('/api/courses/1/students/7/status', [
                'status' => 'INHABILITADO',
            ]);

        $response->assertStatus(422);
    }
    
    public function test_inhabilitacion_history_is_preserved_without_duplicates()
    {
        [, $student, $courseGroup] = $this->createStatusScenario();

        $headers = $this->getAuthHeaders();

        $url = "/api/courses/{$courseGroup->id}/students/{$student->id}/status";

        // 1. Primera inhabilitación: debe generar un antecedente.
        $this->withHeaders($headers)
            ->putJson($url, [
                'status' => 'INHABILITADO',
                'reason' => 'Inhabilitación de prueba HU30',
            ])->assertStatus(200);

        $this->assertEquals(1, $this->countBlackListRecords());

        // 2. Repetir la inhabilitación: no debe duplicar el antecedente.
        $this->withHeaders($headers)
            ->putJson($url, [
                'status' => 'INHABILITADO',
                'reason' => 'Inhabilitación de prueba HU30',
            ])->assertStatus(200);

        $this->assertEquals(1, $this->countBlackListRecords());

        // 3. Habilitar nuevamente: debe conservar el antecedente.
        $this->withHeaders($headers)
            ->putJson($url, [
                'status' => 'HABILITADO',
            ])->assertStatus(200);

        $this->assertEquals(1, $this->countBlackListRecords());

        // 4. Inhabilitar nuevamente: debe generar un nuevo antecedente.
        $this->withHeaders($headers)
            ->putJson($url, [
                'status' => 'INHABILITADO',
                'reason' => 'Nueva inhabilitación de prueba HU30',
            ])->assertStatus(200);

        $this->assertEquals(2, $this->countBlackListRecords());
    }

    private function countBlackListRecords(): int
    {
        return DB::table('registro_auditoria')
            ->where('accion', 'CAMBIAR_ESTADO_HABILITACION')
            ->get()
            ->filter(function ($record) {
                $details = json_decode($record->detalles, true);

                return ($details['estado_nuevo_nombre'] ?? null) === 'INHABILITADO';
            })
            ->count();
    }
}
