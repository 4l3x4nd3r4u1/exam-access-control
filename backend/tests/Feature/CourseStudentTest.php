<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\CourseGroup;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;

class CourseStudentTest extends TestCase
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

    // GET /api/courses/{courseGroupId}/students
    public function test_list_students_requires_auth()
    {
        $response = $this->getJson('/api/courses/1/students');
        $response->assertStatus(401);
    }

    public function test_list_students_not_found()
    {
        $response = $this->withHeaders($this->getAuthHeaders())
            ->getJson('/api/courses/99999/students');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data', []);
    }
}
