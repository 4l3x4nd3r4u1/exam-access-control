<?php

namespace Tests\Feature;

use App\Models\CourseGroup;
use App\Models\Student;
use App\Models\StudentCourseEnrollment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;
use Tests\TestCase;

class TeacherSubjectTest extends TestCase
{
    use RefreshDatabase;

    public function test_teacher_can_list_only_assigned_subjects_with_summary(): void
    {
        $teacher = $this->createUser('Docente Uno', 'docente1@umss.edu.bo', 'TEACHER');
        $otherTeacher = $this->createUser('Docente Dos', 'docente2@umss.edu.bo', 'TEACHER');

        CourseGroup::create([
            'course_group_id' => 'INF110-G1-2/2026',
            'subject_code' => 'INF110',
            'subject_name' => 'Introduccion a la Programacion',
            'group_code' => '1',
            'academic_term' => '2/2026',
            'teacher_id' => $teacher->id,
        ]);

        CourseGroup::create([
            'course_group_id' => 'MAT101-G2-2/2026',
            'subject_code' => 'MAT101',
            'subject_name' => 'Calculo I',
            'group_code' => '2',
            'academic_term' => '2/2026',
            'teacher_id' => $otherTeacher->id,
        ]);

        $this->enrollStudent('INF110-G1-2/2026', '20260001', '111111', 'Ana Rojas');
        $this->enrollStudent('INF110-G1-2/2026', '20260002', '222222', 'Luis Arce');
        $this->enrollStudent('MAT101-G2-2/2026', '20260003', '333333', 'Carla Soto');

        $response = $this
            ->withHeader('Authorization', 'Bearer ' . JWTAuth::fromUser($teacher))
            ->getJson('/api/teacher/subjects');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.summary.subjects_count', 1)
            ->assertJsonPath('data.summary.students_count', 2)
            ->assertJsonPath('data.summary.academic_period', '2/2026')
            ->assertJsonCount(1, 'data.subjects')
            ->assertJsonPath('data.subjects.0.course_group_id', 'INF110-G1-2/2026')
            ->assertJsonPath('data.subjects.0.subject_code', 'INF110')
            ->assertJsonPath('data.subjects.0.subject_name', 'Introduccion a la Programacion')
            ->assertJsonPath('data.subjects.0.group_code', '1')
            ->assertJsonPath('data.subjects.0.enrolled_count', 2)
            ->assertJsonPath('data.subjects.0.teacher_name', 'Docente Uno');
    }

    public function test_teacher_without_subjects_receives_empty_summary(): void
    {
        $teacher = $this->createUser('Docente Sin Materias', 'sinmaterias@umss.edu.bo', 'TEACHER');

        $response = $this
            ->withHeader('Authorization', 'Bearer ' . JWTAuth::fromUser($teacher))
            ->getJson('/api/teacher/subjects');

        $response->assertStatus(200)
            ->assertJsonPath('data.summary.subjects_count', 0)
            ->assertJsonPath('data.summary.students_count', 0)
            ->assertJsonPath('data.summary.academic_period', null)
            ->assertJsonCount(0, 'data.subjects');
    }

    public function test_teacher_subject_detail_returns_students_alphabetically(): void
    {
        $teacher = $this->createUser('Docente Titular', 'docente@umss.edu.bo', 'TEACHER');

        CourseGroup::create([
            'course_group_id' => 'INF110-G1-2/2026',
            'subject_code' => 'INF110',
            'subject_name' => 'Introduccion a la Programacion',
            'group_code' => '1',
            'academic_term' => '2/2026',
            'teacher_id' => $teacher->id,
        ]);

        $this->enrollStudent('INF110-G1-2/2026', '20260002', '222222', 'Zapata Rojas Ana');
        $this->enrollStudent('INF110-G1-2/2026', '20260001', '111111', 'Arce Flores Luis');

        $response = $this
            ->withHeader('Authorization', 'Bearer ' . JWTAuth::fromUser($teacher))
            ->getJson('/api/teacher/subjects/' . rawurlencode('INF110-G1-2/2026'));

        $response->assertStatus(200)
            ->assertJsonPath('data.subject.subject_code', 'INF110')
            ->assertJsonPath('data.subject.subject_name', 'Introduccion a la Programacion')
            ->assertJsonPath('data.subject.teacher_name', 'Docente Titular')
            ->assertJsonPath('data.subject.group_code', '1')
            ->assertJsonPath('data.subject.academic_term', '2/2026')
            ->assertJsonPath('data.students.0.sis', '20260001')
            ->assertJsonPath('data.students.0.ci', '111111')
            ->assertJsonPath('data.students.0.full_name', 'Arce Flores Luis')
            ->assertJsonPath('data.students.1.full_name', 'Zapata Rojas Ana');
    }

    public function test_teacher_cannot_access_other_teacher_subject_detail(): void
    {
        $teacher = $this->createUser('Docente Uno', 'docente1@umss.edu.bo', 'TEACHER');
        $otherTeacher = $this->createUser('Docente Dos', 'docente2@umss.edu.bo', 'TEACHER');

        CourseGroup::create([
            'course_group_id' => 'MAT101-G2-2/2026',
            'subject_code' => 'MAT101',
            'subject_name' => 'Calculo I',
            'group_code' => '2',
            'academic_term' => '2/2026',
            'teacher_id' => $otherTeacher->id,
        ]);

        $response = $this
            ->withHeader('Authorization', 'Bearer ' . JWTAuth::fromUser($teacher))
            ->getJson('/api/teacher/subjects/' . rawurlencode('MAT101-G2-2/2026'));

        $response->assertStatus(403)
            ->assertJsonPath('success', false);
    }

    public function test_teacher_subject_detail_returns_404_when_missing(): void
    {
        $teacher = $this->createUser('Docente Uno', 'docente1@umss.edu.bo', 'TEACHER');

        $response = $this
            ->withHeader('Authorization', 'Bearer ' . JWTAuth::fromUser($teacher))
            ->getJson('/api/teacher/subjects/' . rawurlencode('NO-EXISTE'));

        $response->assertStatus(404)
            ->assertJsonPath('success', false);
    }

    public function test_teacher_subjects_reject_unauthenticated_and_non_teacher_users(): void
    {
        $admin = $this->createUser('Administrador', 'admin@umss.edu.bo', 'ADMIN');

        $this->getJson('/api/teacher/subjects')
            ->assertStatus(401)
            ->assertJsonPath('success', false);

        $this
            ->withHeader('Authorization', 'Bearer ' . JWTAuth::fromUser($admin))
            ->getJson('/api/teacher/subjects')
            ->assertStatus(403)
            ->assertJsonPath('success', false);
    }

    private function createUser(string $name, string $email, string $role): User
    {
        return User::create([
            'name' => $name,
            'email' => $email,
            'password' => bcrypt('password123'),
            'role' => $role,
            'is_active' => true,
        ]);
    }

    private function enrollStudent(string $courseGroupId, string $sis, string $ci, string $name): void
    {
        Student::create([
            'student_key' => $sis,
            'ci' => $ci,
            'full_name' => $name,
        ]);

        StudentCourseEnrollment::create([
            'student_key' => $sis,
            'course_group_id' => $courseGroupId,
            'status' => 'HABILITADO',
        ]);
    }
}
