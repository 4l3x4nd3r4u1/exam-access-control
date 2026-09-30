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
                    'role' => 'DOCENTE',
                    'full_name' => 'Docente Perez',
                    'email' => 'docente@umss.edu.bo',
                    'token_type' => 'bearer',
                ],
            ]);

        $this->assertNotNull($response->json('data.token'));
    }

    public function test_authenticated_user_can_get_profile_and_logout(): void
    {
        $user = User::create([
            'name' => 'Docente Perez',
            'email' => 'docente@umss.edu.bo',
            'role' => 'DOCENTE',
            'password' => bcrypt('password123'),
            'is_active' => true,
        ]);

        $loginResponse = $this->postJson('/api/auth/login', [
            'email' => 'docente@umss.edu.bo',
            'password' => 'password123',
        ]);

        $token = $loginResponse->json('data.token');

        $meResponse = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/auth/me');

        $meResponse->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'user_id' => $user->id,
                    'email' => 'docente@umss.edu.bo',
                    'role' => 'DOCENTE',
                ],
            ]);

        $logoutResponse = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/auth/logout');

        $logoutResponse->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Sesión cerrada exitosamente',
            ]);
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
