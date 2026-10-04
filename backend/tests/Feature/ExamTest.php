<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\CourseGroup;
use App\Models\ExamType;
use App\Models\Room;
use App\Models\StudentCourseEnrollment;
use App\Models\EnrollmentStatus;
use App\Models\ExamStudentStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;

class ExamTest extends TestCase
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

    // GET /api/courses/{courseGroupId}/exams
    public function test_list_exams_requires_auth()
    {
        $response = $this->getJson('/api/courses/1/exams');
        $response->assertStatus(401);
    }

    // POST /api/courses/{courseGroupId}/exams
    public function test_register_exam_requires_auth()
    {
        $response = $this->postJson('/api/courses/1/exams', []);
        $response->assertStatus(401);
    }

    public function test_register_exam_invalid_exam_type()
    {
        $payload = [
            'examTypeId' => 999,
            'date' => '2026-11-15',
            'startTime' => '08:00',
            'rooms' => [['roomId' => 1, 'students' => [10]]],
        ];

        $response = $this->withHeaders($this->getAuthHeaders())
            ->postJson('/api/courses/1/exams', $payload);

        $response->assertStatus(422);
    }

    public function test_register_exam_invalid_room()
    {
        $payload = [
            'examTypeId' => 1,
            'date' => '2026-11-15',
            'startTime' => '08:00',
            'rooms' => [['roomId' => 999, 'students' => [10]]],
        ];

        $response = $this->withHeaders($this->getAuthHeaders())
            ->postJson('/api/courses/1/exams', $payload);

        $response->assertStatus(422);
    }

    public function test_register_exam_invalid_student()
    {
        $payload = [
            'examTypeId' => 1,
            'date' => '2026-11-15',
            'startTime' => '08:00',
            'rooms' => [['roomId' => 1, 'students' => [99999]]],
        ];

        $response = $this->withHeaders($this->getAuthHeaders())
            ->postJson('/api/courses/1/exams', $payload);

        $response->assertStatus(400)
            ->assertJsonPath('success', false);
    }

    public function test_register_exam_duplicate_students_in_rooms()
    {
        $payload = [
            'examTypeId' => 1,
            'date' => '2026-11-15',
            'startTime' => '08:00',
            'rooms' => [
                ['roomId' => 1, 'students' => [10, 11]],
                ['roomId' => 2, 'students' => [11, 12]], // student 11 in both rooms
            ],
        ];

        $response = $this->withHeaders($this->getAuthHeaders())
            ->postJson('/api/courses/1/exams', $payload);

        $response->assertStatus(400);
    }
}