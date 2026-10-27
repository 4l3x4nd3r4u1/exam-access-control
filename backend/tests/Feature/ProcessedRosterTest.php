<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\CourseGroup;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;

class ProcessedRosterTest extends TestCase
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

    // GET /api/processed-rosters
    public function test_list_rosters_requires_auth()
    {
        $response = $this->getJson('/api/processed-rosters');
        $response->assertStatus(401);
    }

    // GET /api/processed-rosters/{courseGroupId}
    public function test_show_roster_requires_auth()
    {
        $response = $this->getJson('/api/processed-rosters/1');
        $response->assertStatus(401);
    }

    public function test_show_roster_not_found()
    {
        $response = $this->withHeaders($this->getAuthHeaders())
            ->getJson('/api/processed-rosters/99999');

        $response->assertStatus(404)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'Planilla no encontrada');
    }
}
