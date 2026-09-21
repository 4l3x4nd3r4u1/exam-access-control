<?php

namespace Tests\Feature;

use App\Models\CourseGroup;
use App\Models\Student;
use App\Models\StudentCourseEnrollment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CourseStudentTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_list_enrolled_students_of_a_course_via_api(): void
    {
        $teacher = User::create([
            'name' => 'Docente Titular',
            'email' => 'docente@umss.edu.bo',
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
            'student_key' => '202001234',
            'ci' => '7891234',
            'full_name' => 'ALVAREZ PEDRO',
        ]);

        StudentCourseEnrollment::create([
            'student_key' => '202001234',
            'course_group_id' => 'INF110-G1-2/2026',
            'status' => 'HABILITADO',
            'ineligibility_reason' => null,
        ]);

        $response = $this->getJson('/api/courses/INF110-G1-2/2026/students');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    [
                        'studentKey' => '202001234',
                        'ci' => '7891234',
                        'fullName' => 'ALVAREZ PEDRO',
                        'status' => 'HABILITADO',
                        'ineligibilityReason' => null,
                    ]
                ],
                'message' => 'Estudiantes del curso obtenidos exitosamente.',
            ]);
    }
}
