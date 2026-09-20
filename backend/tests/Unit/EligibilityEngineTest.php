<?php

namespace Tests\Unit;

use App\Models\CourseGroup;
use App\Models\Student;
use App\Models\StudentCourseEnrollment;
use App\Models\User;
use App\Modules\EligibilityEngine;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EligibilityEngineTest extends TestCase
{
    use RefreshDatabase;

    private EligibilityEngine $engine;

    protected function setUp(): void
    {
        parent::setUp();
        $this->engine = new EligibilityEngine();
    }

    public function test_can_update_student_status_to_inhabilitado_with_reason(): void
    {
        $teacher = User::create([
            'name' => 'Docente Prueba',
            'email' => 'docente.test@umss.edu.bo',
            'password' => bcrypt('password123'),
            'role' => 'TEACHER',
            'is_active' => true,
        ]);

        CourseGroup::create([
            'course_group_id' => 'INF110-G1-2/2026',
            'subject_code' => 'INF110',
            'subject_name' => 'Introduccion a la Programacion',
            'group_code' => '1',
            'academic_term' => '2/2026',
            'teacher_id' => $teacher->id,
        ]);

        Student::create([
            'student_key' => '202100482',
            'ci' => '8765432',
            'full_name' => 'Perez Gomez Juan Carlos',
        ]);

        StudentCourseEnrollment::create([
            'student_key' => '202100482',
            'course_group_id' => 'INF110-G1-2/2026',
            'status' => 'HABILITADO',
            'ineligibility_reason' => null,
        ]);

        $result = $this->engine->updateStudentStatus(
            key: '202100482',
            courseGroupId: 'INF110-G1-2/2026',
            status: 'INHABILITADO',
            reason: 'No entrego Proyecto 2'
        );

        $this->assertTrue($result->isSuccessful);
        $this->assertEquals('Estado del estudiante actualizado correctamente.', $result->message);

        $this->assertDatabaseHas('student_course_enrollments', [
            'student_key' => '202100482',
            'course_group_id' => 'INF110-G1-2/2026',
            'status' => 'INHABILITADO',
            'ineligibility_reason' => 'No entrego Proyecto 2',
        ]);
    }

    public function test_can_update_student_status_using_ci(): void
    {
        $teacher = User::create([
            'name' => 'Docente Prueba',
            'email' => 'docente.test@umss.edu.bo',
            'password' => bcrypt('password123'),
            'role' => 'TEACHER',
            'is_active' => true,
        ]);

        CourseGroup::create([
            'course_group_id' => 'INF110-G1-2/2026',
            'subject_code' => 'INF110',
            'subject_name' => 'Introduccion a la Programacion',
            'group_code' => '1',
            'academic_term' => '2/2026',
            'teacher_id' => $teacher->id,
        ]);

        Student::create([
            'student_key' => '202100482',
            'ci' => '8765432',
            'full_name' => 'Perez Gomez Juan Carlos',
        ]);

        StudentCourseEnrollment::create([
            'student_key' => '202100482',
            'course_group_id' => 'INF110-G1-2/2026',
            'status' => 'INHABILITADO',
            'ineligibility_reason' => 'Falta justificada',
        ]);

        $result = $this->engine->updateStudentStatus(
            key: '8765432',
            courseGroupId: 'INF110-G1-2/2026',
            status: 'HABILITADO',
            reason: null
        );

        $this->assertTrue($result->isSuccessful);
        $this->assertEquals('Estado del estudiante actualizado correctamente.', $result->message);

        $this->assertDatabaseHas('student_course_enrollments', [
            'student_key' => '202100482',
            'course_group_id' => 'INF110-G1-2/2026',
            'status' => 'HABILITADO',
            'ineligibility_reason' => null,
        ]);
    }

    public function test_rejects_inhabilitado_without_reason(): void
    {
        $result = $this->engine->updateStudentStatus(
            key: '202100482',
            courseGroupId: 'INF110-G1-2/2026',
            status: 'INHABILITADO',
            reason: '   '
        );

        $this->assertFalse($result->isSuccessful);
        $this->assertEquals('El motivo de inhabilitación es obligatorio.', $result->message);
    }

    public function test_rejects_invalid_status(): void
    {
        $result = $this->engine->updateStudentStatus(
            key: '202100482',
            courseGroupId: 'INF110-G1-2/2026',
            status: 'OTRO_ESTADO'
        );

        $this->assertFalse($result->isSuccessful);
        $this->assertStringContainsString('Estado no válido', $result->message);
    }

    public function test_returns_error_when_student_not_found(): void
    {
        $result = $this->engine->updateStudentStatus(
            key: '999999999',
            courseGroupId: 'INF110-G1-2/2026',
            status: 'HABILITADO'
        );

        $this->assertFalse($result->isSuccessful);
        $this->assertEquals('Estudiante no encontrado.', $result->message);
    }

    public function test_returns_error_when_student_not_enrolled_in_course(): void
    {
        Student::create([
            'student_key' => '202100482',
            'ci' => '8765432',
            'full_name' => 'Perez Gomez Juan Carlos',
        ]);

        $result = $this->engine->updateStudentStatus(
            key: '202100482',
            courseGroupId: 'MAT101-G2-2/2026',
            status: 'HABILITADO'
        );

        $this->assertFalse($result->isSuccessful);
        $this->assertEquals('El estudiante no está inscrito en este grupo de materia.', $result->message);
    }
}
