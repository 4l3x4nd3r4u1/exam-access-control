<?php

namespace Tests\Feature;

use App\Models\CourseGroup;
use App\Models\Student;
use App\Models\StudentCourseEnrollment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StudentStatusTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_update_student_status_via_api(): void
    {
        $teacher = User::create([
            'name' => 'Docente Titular',
            'email' => 'docente.titular@fcyt.umss.edu.bo',
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

        $response = $this->putJson('/api/courses/INF110-G1-2%2F2026/students/202100482/status', [
            'status' => 'INHABILITADO',
            'reason' => 'No entrego Proyecto 1',
        ]);

        $response
            ->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Estado del estudiante actualizado correctamente.',
            ]);

        $this->assertDatabaseHas('student_course_enrollments', [
            'student_key' => '202100482',
            'course_group_id' => 'INF110-G1-2/2026',
            'status' => 'INHABILITADO',
            'ineligibility_reason' => 'No entrego Proyecto 1',
        ]);
    }

    public function test_update_status_validates_inhabilitado_reason_via_api(): void
    {
        $response = $this->putJson('/api/courses/INF110-G1-2%2F2026/students/202100482/status', [
            'status' => 'INHABILITADO',
            'reason' => '',
        ]);

        $response
            ->assertStatus(422)
            ->assertJsonValidationErrors(['reason']);
    }
}
