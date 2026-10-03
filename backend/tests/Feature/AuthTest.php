<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Role;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_login_success()
    {
        $response = $this->postJson('/api/auth/login', [
            'email' => 'ana.morales@umss.edu.bo',
            'password' => 'password123',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'message',
                'data' => ['token', 'token_type', 'expires_in', 'is_active'],
            ])
            ->assertJsonPath('success', true);
    }

    public function test_login_invalid_credentials()
    {
        $response = $this->postJson('/api/auth/login', [
            'email' => 'ana.morales@umss.edu.bo',
            'password' => 'wrongpassword',
        ]);

        $response->assertStatus(401)
            ->assertJsonPath('success', false);
    }

    public function test_login_missing_fields()
    {
        $response = $this->postJson('/api/auth/login', [
            'email' => 'ana.morales@umss.edu.bo',
        ]);

        $response->assertStatus(422);
    }

    public function test_me_authenticated()
    {
        $user = User::where('email', 'ana.morales@umss.edu.bo')->first();
        $token = JWTAuth::fromUser($user);

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->getJson('/api/auth/me');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => ['user_id', 'name', 'email', 'ci'],
            ])
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.user_id', 2);
    }

    public function test_logout_success()
    {
        $user = User::where('email', 'ana.morales@umss.edu.bo')->first();
        $token = JWTAuth::fromUser($user);

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->postJson('/api/auth/logout');

        $response->assertStatus(200)
            ->assertJsonPath('success', true);
    }
}
