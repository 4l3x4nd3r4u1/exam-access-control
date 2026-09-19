<?php

namespace Tests\Feature;

use App\Models\CourseGroup;
use App\Models\Student;
use App\Models\StudentCourseEnrollment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProcessedRosterTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_list_processed_rosters_with_student_count(): void
    {
        $teacher = User::create([
            'name' => 'Walter Sanchez',
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

        Student::create([
            'student_key' => '20210001',
            'ci' => '111111',
            'full_name' => 'Student One',
        ]);

        Student::create([
            'student_key' => '20210002',
            'ci' => '222222',
            'full_name' => 'Student Two',
        ]);

        StudentCourseEnrollment::create([
            'student_key' => '20210001',
            'course_group_id' => 'INF110-G1-2/2026',
            'status' => 'HABILITADO',
        ]);

        StudentCourseEnrollment::create([
            'student_key' => '20210002',
            'course_group_id' => 'INF110-G1-2/2026',
            'status' => 'HABILITADO',
        ]);

        $response = $this->getJson('/api/processed-rosters');

        $response
            ->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    [
                        'courseGroupId' => 'INF110-G1-2/2026',
                        'subjectCode' => 'INF110',
                        'subjectName' => 'Introduccion a la Programacion',
                        'groupCode' => '1',
                        'academicTerm' => '2/2026',
                        'totalStudents' => 2,
                    ],
                ],
                'message' => 'Planillas procesadas obtenidas exitosamente.',
            ]);
    }

    public function test_returns_empty_list_when_no_processed_rosters_exist(): void
    {
        $response = $this->getJson('/api/processed-rosters');

        $response
            ->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [],
                'message' => 'Planillas procesadas obtenidas exitosamente.',
            ]);
    }
}