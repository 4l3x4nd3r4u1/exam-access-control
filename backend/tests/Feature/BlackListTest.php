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

    public function test_blacklist_expulsions_mode_lists_only_expelled_students_with_counts_and_latest_date()
    {
        [$inhabilitatedStudent, $courseGroup] = $this->createStatusScenario();
        $this->updateStudentStatus(
            $inhabilitatedStudent,
            $courseGroup,
            'INHABILITADO',
            'Solo inhabilitado academico'
        );

        $teacher = User::where('email', 'ana.morales@umss.edu.bo')->first();
        $emailId = EmailDomain::where('dominio', '@est.umss.edu')->value('id');
        $expelledStudent = User::create([
            'nombre' => 'Estudiante Expulsado',
            'email' => 'expulsado.hu30@umss.edu',
            'email_id' => $emailId,
            'contrasena' => bcrypt('password123'),
            'ci' => '77777777',
            'activo' => true,
        ]);
        Student::create([
            'codigo_sis' => 202630099,
            'usuario_id' => $expelledStudent->id,
        ]);

        $examTypeId = DB::table('tipo_examen')->value('id');
        $roomId = DB::table('aula')->insertGetId([
            'nombre' => 'Auditorio 1',
            'capacidad' => 100,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $examId = DB::table('examen')->insertGetId([
            'materia_grupo_id' => $courseGroup->id,
            'tipo_examen_id' => $examTypeId,
            'fecha' => '2026-11-14',
            'hora_inicio' => '10:00:00',
            'hora_fin' => '12:00:00',
            'activo' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $expelledStatusId = DB::table('estado_examen_estudiante')->where('nombre', 'EXPULSADO')->value('id');
        DB::table('examen_estudiante')->insert([
            'examen_id' => $examId,
            'usuario_id' => $expelledStudent->id,
            'aula_id' => $roomId,
            'estado_id' => $expelledStatusId,
            'motivo_expulsion' => 'Uso de telefono en examen',
            'created_at' => '2026-11-14 10:35:00',
            'updated_at' => '2026-11-14 10:35:00',
        ]);
        DB::table('registro_acceso_examen')->insert([
            'exam_id' => $examId,
            'aula_id' => $roomId,
            'user_id_estudiante' => $expelledStudent->id,
            'user_id_operador' => $teacher->id,
            'fecha' => '2026-11-14',
            'hora' => '10:35:00',
            'resultado' => 'EXPULSION',
            'observacion' => 'Uso de telefono en examen',
            'created_at' => '2026-11-14 10:35:00',
            'updated_at' => '2026-11-14 10:35:00',
        ]);

        $this->withHeaders($this->getAuthHeaders())
            ->getJson('/api/blacklist?type=expulsions')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.user_id', $expelledStudent->id)
            ->assertJsonPath('data.0.total_expulsiones', 1)
            ->assertJsonPath('data.0.ultima_fecha', '2026-11-14 10:35:00')
            ->assertJsonPath('meta.available_gestiones.0', '2026-HU30');
    }

    public function test_blacklist_expulsions_filters_by_gestion_and_sorts()
    {
        $teacher = User::where('email', 'ana.morales@umss.edu.bo')->first();
        $course1 = DB::table('materia')->where('sigla', 'INF110')->first();
        $course2 = DB::table('materia')->where('sigla', 'INF210')->first();
        $emailId = EmailDomain::where('dominio', '@est.umss.edu')->value('id');
        $examTypeId = DB::table('tipo_examen')->value('id');

        $cg1 = CourseGroup::create([
            'materia_id' => $course1->id,
            'grupo' => '1',
            'gestion' => '1-2026',
            'docente_id' => $teacher->id,
            'activo' => true,
        ]);
        $cg2 = CourseGroup::create([
            'materia_id' => $course2->id,
            'grupo' => '2',
            'gestion' => '2-2026',
            'docente_id' => $teacher->id,
            'activo' => true,
        ]);

        $s1 = User::create([
            'nombre' => 'Alumno Dos Expulsiones',
            'email' => 'dos.exp@umss.edu',
            'email_id' => $emailId,
            'contrasena' => bcrypt('password123'),
            'ci' => '61000001',
            'activo' => true,
        ]);
        Student::create(['codigo_sis' => 202600001, 'usuario_id' => $s1->id]);

        $s2 = User::create([
            'nombre' => 'Alumno Mas Reciente',
            'email' => 'reciente.exp@umss.edu',
            'email_id' => $emailId,
            'contrasena' => bcrypt('password123'),
            'ci' => '61000002',
            'activo' => true,
        ]);
        Student::create(['codigo_sis' => 202600002, 'usuario_id' => $s2->id]);

        $e1 = DB::table('examen')->insertGetId([
            'materia_grupo_id' => $cg1->id,
            'tipo_examen_id' => $examTypeId,
            'fecha' => '2026-06-10',
            'hora_inicio' => '08:00:00',
            'hora_fin' => '10:00:00',
            'activo' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $e2 = DB::table('examen')->insertGetId([
            'materia_grupo_id' => $cg1->id,
            'tipo_examen_id' => $examTypeId,
            'fecha' => '2026-06-20',
            'hora_inicio' => '08:00:00',
            'hora_fin' => '10:00:00',
            'activo' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $e3 = DB::table('examen')->insertGetId([
            'materia_grupo_id' => $cg2->id,
            'tipo_examen_id' => $examTypeId,
            'fecha' => '2026-11-15',
            'hora_inicio' => '10:00:00',
            'hora_fin' => '12:00:00',
            'activo' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('registro_acceso_examen')->insert([
            [
                'exam_id' => $e1, 'aula_id' => null, 'user_id_estudiante' => $s1->id,
                'user_id_operador' => $teacher->id, 'fecha' => '2026-06-10', 'hora' => '08:30:00',
                'resultado' => 'EXPULSION', 'observacion' => 'Motivo 1',
                'created_at' => now(), 'updated_at' => now(),
            ],
            [
                'exam_id' => $e2, 'aula_id' => null, 'user_id_estudiante' => $s1->id,
                'user_id_operador' => $teacher->id, 'fecha' => '2026-06-20', 'hora' => '08:40:00',
                'resultado' => 'EXPULSION', 'observacion' => 'Motivo 2',
                'created_at' => now(), 'updated_at' => now(),
            ],
            [
                'exam_id' => $e3, 'aula_id' => null, 'user_id_estudiante' => $s2->id,
                'user_id_operador' => $teacher->id, 'fecha' => '2026-11-15', 'hora' => '10:25:00',
                'resultado' => 'EXPULSION', 'observacion' => 'Motivo reciente',
                'created_at' => now(), 'updated_at' => now(),
            ],
        ]);

        $this->withHeaders($this->getAuthHeaders())
            ->getJson('/api/blacklist?type=expulsions&sort=recent')
            ->assertOk()
            ->assertJsonPath('data.0.user_id', $s2->id)
            ->assertJsonPath('data.1.user_id', $s1->id);

        $this->withHeaders($this->getAuthHeaders())
            ->getJson('/api/blacklist?type=expulsions&sort=count')
            ->assertOk()
            ->assertJsonPath('data.0.user_id', $s1->id)
            ->assertJsonPath('data.0.total_expulsiones', 2);

        $this->withHeaders($this->getAuthHeaders())
            ->getJson('/api/blacklist?type=expulsions&gestion=2-2026')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.user_id', $s2->id);
    }

    public function test_blacklist_expulsions_detail_includes_exam_type_room_and_operator()
    {
        [$student, $courseGroup] = $this->createStatusScenario();
        $teacher = User::where('email', 'ana.morales@umss.edu.bo')->first();
        $operator = User::where('email', 'carlos.mendoza@umss.edu.bo')->first();
        $examTypeId = DB::table('tipo_examen')->value('id');
        $roomId = DB::table('aula')->insertGetId([
            'nombre' => 'Aula 691-B',
            'capacidad' => 50,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $examId = DB::table('examen')->insertGetId([
            'materia_grupo_id' => $courseGroup->id,
            'tipo_examen_id' => $examTypeId,
            'fecha' => '2026-11-12',
            'hora_inicio' => '14:00:00',
            'hora_fin' => '16:00:00',
            'activo' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('registro_acceso_examen')->insert([
            'exam_id' => $examId,
            'aula_id' => $roomId,
            'user_id_estudiante' => $student->id,
            'user_id_operador' => $operator->id,
            'fecha' => '2026-11-12',
            'hora' => '14:20:00',
            'resultado' => 'EXPULSION',
            'observacion' => 'Apuntes ocultos',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->withHeaders($this->getAuthHeaders())
            ->getJson("/api/blacklist/{$student->id}?type=expulsions")
            ->assertOk()
            ->assertJsonPath('data.total_expulsiones', 1)
            ->assertJsonFragment([
                'materia' => 'INF110',
                'aula' => 'Aula 691-B',
                'registrado_por' => $operator->nombre,
                'motivo' => 'Apuntes ocultos',
                'origen' => 'PUNTOS_CONTROL',
            ]);
    }
}
