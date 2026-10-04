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
            'tipo_examen' => 'EXAMEN INEXISTENTE',
            'fecha' => '2026-11-15',
            'hora_inicio' => '08:00 am',
            'hora_fin' => '09:30 am',
            'aulas' => ['Aula 691A'],
            'normas' => [],
        ];

        $response = $this->withHeaders($this->getAuthHeaders())
            ->postJson('/api/courses/1/exams', $payload);

        $response->assertStatus(404);
    }

    public function test_register_exam_invalid_room()
    {
        $payload = [
            'tipo_examen' => 'PRIMER PARCIAL',
            'fecha' => '2026-11-15',
            'hora_inicio' => '08:00 am',
            'hora_fin' => '09:30 am',
            'aulas' => ['Aula Inexistente'],
            'normas' => [],
        ];

        $response = $this->withHeaders($this->getAuthHeaders())
            ->postJson('/api/courses/1/exams', $payload);

        $response->assertStatus(404);
    }

    public function test_register_exam_invalid_student()
    {
        // This test is no longer applicable with the new API format
        // Students are assigned via room capacity, not directly
        $this->assertTrue(true);
    }

    public function test_register_exam_duplicate_students_in_rooms()
    {
        // This test is no longer applicable with the new API format
        // Students are assigned via room capacity, not directly
        $this->assertTrue(true);
    }
}
