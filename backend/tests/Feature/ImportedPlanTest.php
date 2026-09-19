<?php

namespace Tests\Feature;

use App\Models\CourseGroup;
use App\Models\Student;
use App\Models\StudentCourseEnrollment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;
use Tests\TestCase;

class ImportedPlanTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_list_imported_plans_newest_first(): void
    {
        $admin = $this->createUser('Administrador', 'admin@umss.edu.bo', 'ADMIN');
        $teacher = $this->createUser('Docente Titular', 'docente@umss.edu.bo', 'TEACHER');

        $older = CourseGroup::create([
            'course_group_id' => 'INF110-G1-2/2026',
            'subject_code' => 'INF110',
            'subject_name' => 'Introduccion a la Programacion',
            'group_code' => '1',
            'academic_term' => '2/2026',
            'teacher_id' => $teacher->id,
        ]);

        $newer = CourseGroup::create([
            'course_group_id' => 'MAT101-G2-2/2026',
            'subject_code' => 'MAT101',
            'subject_name' => 'Calculo I',
            'group_code' => '2',
            'academic_term' => '2/2026',
            'teacher_id' => $teacher->id,
        ]);

        $older->forceFill(['updated_at' => now()->subDay()])->save();
        $newer->forceFill(['updated_at' => now()])->save();

        $this->enrollStudent($older->course_group_id, '20260001', '111111', 'Zapata Rojas Ana');
        $this->enrollStudent($newer->course_group_id, '20260002', '222222', 'Arce Flores Luis');
        $this->enrollStudent($newer->course_group_id, '20260003', '333333', 'Mamani Soto Carla');

        $response = $this
            ->withHeader('Authorization', 'Bearer ' . JWTAuth::fromUser($admin))
            ->getJson('/api/imported-plans');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.total', 2)
            ->assertJsonPath('data.plans.0.course_group_id', 'MAT101-G2-2/2026')
            ->assertJsonPath('data.plans.0.teacher_name', 'Docente Titular')
            ->assertJsonPath('data.plans.0.total_enrolled', 2)
            ->assertJsonPath('data.plans.1.course_group_id', 'INF110-G1-2/2026');
    }

    public function test_imported_plan_detail_returns_students_ordered_by_name(): void
    {
        $admin = $this->createUser('Administrador', 'admin@umss.edu.bo', 'ADMIN');
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
            ->withHeader('Authorization', 'Bearer ' . JWTAuth::fromUser($admin))
            ->getJson('/api/imported-plans/' . rawurlencode('INF110-G1-2/2026'));

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.plan.subject_code', 'INF110')
            ->assertJsonPath('data.plan.subject_name', 'Introduccion a la Programacion')
            ->assertJsonPath('data.plan.teacher_name', 'Docente Titular')
            ->assertJsonPath('data.plan.group_code', '1')
            ->assertJsonPath('data.plan.academic_term', '2/2026')
            ->assertJsonPath('data.students.0.sis', '20260001')
            ->assertJsonPath('data.students.0.ci', '111111')
            ->assertJsonPath('data.students.0.full_name', 'Arce Flores Luis')
            ->assertJsonPath('data.students.1.full_name', 'Zapata Rojas Ana');
    }

    public function test_imported_plan_detail_returns_404_when_missing(): void
    {
        $admin = $this->createUser('Administrador', 'admin@umss.edu.bo', 'ADMIN');

        $response = $this
            ->withHeader('Authorization', 'Bearer ' . JWTAuth::fromUser($admin))
            ->getJson('/api/imported-plans/' . rawurlencode('NO-EXISTE'));

        $response->assertStatus(404)
            ->assertJsonPath('success', false);
    }

    public function test_imported_plans_require_authentication(): void
    {
        $this->getJson('/api/imported-plans')
            ->assertStatus(401)
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
