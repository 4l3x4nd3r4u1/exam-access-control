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

    public function test_can_get_students_for_a_course_group(): void
    {
        $teacher = User::create([
            'name' => 'Juan Perez',
            'email' => 'jperez@umss.edu.bo',
            'password' => bcrypt('password123'),
            'role' => 'TEACHER',
            'is_active' => true,
        ]);

        $course = CourseGroup::create([
            'course_group_id' => 'INF110-G1-2/2026',
            'subject_code' => 'INF110',
            'subject_name' => 'Introducción a la Programación',
            'group_code' => '1',
            'academic_term' => '2/2026',
            'teacher_id' => $teacher->id,
        ]);

        Student::create([
            'student_key' => '202100482',
            'ci' => '8765432',
            'full_name' => 'Perez Gomez Juan Carlos',
        ]);

        Student::create([
            'student_key' => '202008431',
            'ci' => '5482910',
            'full_name' => 'Torrico Morales Ana Patricia',
        ]);

        StudentCourseEnrollment::create([
            'student_key' => '202100482',
            'course_group_id' => $course->course_group_id,
            'status' => 'HABILITADO',
            'ineligibility_reason' => null,
        ]);

        StudentCourseEnrollment::create([
            'student_key' => '202008431',
            'course_group_id' => $course->course_group_id,
            'status' => 'INHABILITADO',
            'ineligibility_reason' => 'Falta de asistencia requerida',
        ]);

        $response = $this->getJson('/api/courses/INF110-G1-2/2026/students');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    [
                        'studentKey' => '202100482',
                        'sis' => '202100482',
                        'ci' => '8765432',
                        'fullName' => 'Perez Gomez Juan Carlos',
                        'status' => 'Habilitado',
                        'ineligibilityReason' => null,
                    ],
                    [
                        'studentKey' => '202008431',
                        'sis' => '202008431',
                        'ci' => '5482910',
                        'fullName' => 'Torrico Morales Ana Patricia',
                        'status' => 'Inhabilitado',
                        'ineligibilityReason' => 'Falta de asistencia requerida',
                    ],
                ],
                'message' => 'Nómina de estudiantes obtenida exitosamente.',
            ]);
    }

    public function test_can_get_processed_roster_detail(): void
    {
        $teacher = User::create([
            'name' => 'Juan Perez',
            'email' => 'jperez@umss.edu.bo',
            'password' => bcrypt('password123'),
            'role' => 'TEACHER',
            'is_active' => true,
        ]);

        $course = CourseGroup::create([
            'course_group_id' => 'INF110-G1-2/2026',
            'subject_code' => 'INF110',
            'subject_name' => 'Introducción a la Programación',
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
            'course_group_id' => $course->course_group_id,
            'status' => 'HABILITADO',
            'ineligibility_reason' => null,
        ]);

        $response = $this->getJson('/api/processed-rosters/INF110-G1-2/2026');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'roster' => [
                        'courseGroupId' => 'INF110-G1-2/2026',
                        'subjectCode' => 'INF110',
                        'subjectName' => 'Introducción a la Programación',
                        'groupCode' => '1',
                        'academicTerm' => '2/2026',
                        'teacherName' => 'Juan Perez',
                        'totalEnrolled' => 1,
                    ],
                    'students' => [
                        [
                            'studentKey' => '202100482',
                            'sis' => '202100482',
                            'ci' => '8765432',
                            'fullName' => 'Perez Gomez Juan Carlos',
                            'status' => 'Habilitado',
                        ],
                    ],
                ],
                'message' => 'Detalle de planilla procesada obtenido exitosamente.',
            ]);
    }

    public function test_returns_404_for_non_existent_roster_detail(): void
    {
        $response = $this->getJson('/api/processed-rosters/NONEXISTENT-G1-2/2026');

        $response->assertStatus(404)
            ->assertJson([
                'success' => false,
                'message' => 'Planilla no encontrada.',
            ]);
    }
}
