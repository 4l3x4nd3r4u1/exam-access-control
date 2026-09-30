<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AcademicUserTest extends TestCase
{
    use RefreshDatabase;

    private function createAuthenticatedUser(): array
    {
        $user = User::create([
            'nombre' => 'Admin User',
            'email' => 'admin@umss.edu.bo',
            'contrasena' => bcrypt('password123'),
            'activo' => true,
        ]);

        $loginResponse = $this->postJson('/api/auth/login', [
            'email' => 'admin@umss.edu.bo',
            'password' => 'password123',
        ]);

        $token = $loginResponse->json('data.token');

        return ['user' => $user, 'token' => $token];
    }

    public function test_can_register_academic_user(): void
    {
        $auth = $this->createAuthenticatedUser();

        $payload = [
            'fullName' => 'Mariana Rios',
            'email' => 'mariana.rios@umss.edu.bo',
            'password' => 'Password123!',
            'roles' => ['DOCENTE'],
        ];

        $response = $this->withHeader('Authorization', 'Bearer ' . $auth['token'])
            ->postJson('/api/academic-users', $payload);

        $response
            ->assertStatus(201)
            ->assertJson([
                'success' => true,
                'message' => 'Usuario registrado correctamente',
            ]);

        $this->assertDatabaseHas('usuario', [
            'nombre' => 'Mariana Rios',
            'email' => 'mariana.rios@umss.edu.bo',
        ]);
    }

    public function test_can_update_user_roles(): void
    {
        $auth = $this->createAuthenticatedUser();

        $user = User::create([
            'nombre' => 'Carlos Morales',
            'email' => 'carlos.morales@umss.edu.bo',
            'contrasena' => bcrypt('password123'),
            'activo' => true,
        ]);

        $payload = [
            'userId' => $user->id,
            'roles' => ['DOCENTE', 'ADMIN'],
        ];

        $response = $this->withHeader('Authorization', 'Bearer ' . $auth['token'])
            ->putJson("/api/academic-users/{$user->id}/roles", $payload);

        $response
            ->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Roles actualizados correctamente',
            ]);
    }

    public function test_update_user_roles_returns_404_when_user_not_found(): void
    {
        $auth = $this->createAuthenticatedUser();

        $payload = [
            'userId' => 99999,
            'roles' => ['DOCENTE'],
        ];

        $response = $this->withHeader('Authorization', 'Bearer ' . $auth['token'])
            ->putJson('/api/academic-users/99999/roles', $payload);

        $response
            ->assertStatus(404)
            ->assertJson([
                'success' => false,
                'message' => 'Usuario no encontrado',
            ]);
    }

    public function test_update_user_roles_validates_required_fields(): void
    {
        $auth = $this->createAuthenticatedUser();

        $payload = [
            'userId' => 1,
            'roles' => ['ROL_INVALIDO'],
        ];

        $response = $this->withHeader('Authorization', 'Bearer ' . $auth['token'])
            ->putJson('/api/academic-users/1/roles', $payload);

        $response
            ->assertStatus(422)
            ->assertJsonValidationErrors(['roles.0']);
    }
}
