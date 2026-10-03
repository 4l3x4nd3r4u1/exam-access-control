<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\CourseGroup;
use App\Models\StudentCourseEnrollment;
use App\Models\EnrollmentStatus;
use App\Models\ExamStudentStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;

class StudentStatusTest extends TestCase
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

    public function test_update_status_requires_auth()
    {
        $response = $this->putJson('/api/courses/1/students/10/status', [
            'status' => 'INHABILITADO',
            'reason' => 'Test reason',
        ]);
        $response->assertStatus(401);
    }

    public function test_update_status_inhabilitado_requires_reason()
    {
        $response = $this->withHeaders($this->getAuthHeaders())
            ->putJson('/api/courses/1/students/7/status', [
                'status' => 'INHABILITADO',
            ]);

        $response->assertStatus(422);
    }
}
