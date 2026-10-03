<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Role;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;

class CatalogTest extends TestCase
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

    public function test_catalog_roles_success()
    {
        $response = $this->withHeaders($this->getAuthHeaders())
            ->getJson('/api/catalog/roles');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    '*' => ['value', 'label', 'description'],
                ],
            ])
            ->assertJsonPath('success', true);
    }

    // Enrollment Statuses
    public function test_catalog_enrollment_statuses_success()
    {
        $response = $this->withHeaders($this->getAuthHeaders())
            ->getJson('/api/catalog/enrollment-statuses');

        $response->assertStatus(200)
            ->assertJsonPath('success', true);
    }

    // Exam Student Statuses
    public function test_catalog_exam_student_statuses_success()
    {
        $response = $this->withHeaders($this->getAuthHeaders())
            ->getJson('/api/catalog/exam-student-statuses');

        $response->assertStatus(200)
            ->assertJsonPath('success', true);
    }
}
