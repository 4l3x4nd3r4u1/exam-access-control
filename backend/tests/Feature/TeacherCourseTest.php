<?php

namespace Tests\Feature;

use App\Models\CourseGroup;
use App\Models\Student;
use App\Models\StudentCourseEnrollment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TeacherCourseTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_get_assigned_courses_for_teacher(): void
    {
        $teacher = User::create([
            'name' => 'Dr. Walter Sanchez',
            'email' => 'wsanchez@umss.edu.bo',
            'password' => bcrypt('password'),
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

        Student::create(['student_key' => '20210001', 'ci' => '111111', 'full_name' => 'Estudiante Uno']);
        StudentCourseEnrollment::create(['student_key' => '20210001', 'course_group_id' => 'INF110-G1-2/2026', 'status' => 'HABILITADO']);

        $response = $this->getJson("/api/teachers/{$teacher->id}/courses");

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Materias del docente obtenidas exitosamente.',
            ])
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.course_group_id', 'INF110-G1-2/2026')
            ->assertJsonPath('data.0.subject_code', 'INF110')
            ->assertJsonPath('data.0.subject_name', 'Introduccion a la Programacion')
            ->assertJsonPath('data.0.group_code', '1')
            ->assertJsonPath('data.0.academic_term', '2/2026')
            ->assertJsonPath('data.0.total_enrolled', 1)
            ->assertJsonPath('data.0.teacher_id', $teacher->id);
    }
}
