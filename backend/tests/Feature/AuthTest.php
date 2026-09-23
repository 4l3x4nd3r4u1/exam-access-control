<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_login_successfully_and_receive_jwt_token(): void
    {
        $user = User::create([
            'name' => 'Docente Perez',
            'email' => 'docente@umss.edu.bo',
            'role' => 'TEACHER',
            'password' => bcrypt('password123'),
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'docente@umss.edu.bo',
            'password' => 'password123',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Inicio de sesión exitoso',
                'data' => [
                    'user_id' => $user->id,
                    'role' => 'TEACHER',
                    'full_name' => 'Docente Perez',
                    'email' => 'docente@umss.edu.bo',
                    'token_type' => 'bearer',
                ],
            ]);

        $this->assertNotNull($response->json('data.token'));
    }

    public function test_login_fails_with_invalid_credentials(): void
    {
        User::create([
            'name' => 'Docente Perez',
            'email' => 'docente@umss.edu.bo',
            'role' => 'TEACHER',
            'password' => bcrypt('correctPassword'),
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'docente@umss.edu.bo',
            'password' => 'wrongPassword',
        ]);

        $response->assertStatus(401)
            ->assertJson([
                'success' => false,
                'message' => 'Credenciales incorrectas',
            ]);
    }

    public function test_login_fails_when_user_is_inactive(): void
    {
        User::create([
            'name' => 'Docente Inactivo',
            'email' => 'inactivo@umss.edu.bo',
            'role' => 'TEACHER',
            'password' => bcrypt('password123'),
            'is_active' => false,
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'inactivo@umss.edu.bo',
            'password' => 'password123',
        ]);

        $response->assertStatus(401)
            ->assertJson([
                'success' => false,
                'message' => 'Usuario inactivo o deshabilitado',
            ]);
    }

    public function test_login_requires_email_and_password(): void
    {
        $response = $this->postJson('/api/auth/login', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email', 'password']);
    }
}
