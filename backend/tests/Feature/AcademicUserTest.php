<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AcademicUserTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_register_academic_user(): void
    {
        $payload = [
            'fullName' => 'Mariana Rios',
            'email' => 'mariana.rios@umss.edu.bo',
            'password' => 'Password123!',
            'roles' => ['DOCENTE'],
        ];

        $response = $this->postJson('/api/academic-users', $payload);

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

    public function test_can_update_academic_user(): void
    {
        $user = User::create([
            'nombre' => 'Carlos Morales',
            'email' => 'carlos.morales@umss.edu.bo',
            'contrasena' => bcrypt('password123'),
            'activo' => true,
        ]);

        $payload = [
            'fullName' => 'Carlos Morales Modificado',
            'email' => 'carlos.m@umss.edu.bo',
            'roles' => ['DOCENTE'],
        ];

        $response = $this->putJson("/api/academic-users/{$user->id}", $payload);

        $response
            ->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Usuario actualizado correctamente',
            ]);

        $this->assertDatabaseHas('usuario', [
            'id' => $user->id,
            'nombre' => 'Carlos Morales Modificado',
            'email' => 'carlos.m@umss.edu.bo',
        ]);
    }

    public function test_can_update_academic_user_with_new_password(): void
    {
        $user = User::create([
            'nombre' => 'Ana Torrico',
            'email' => 'ana.torrico@umss.edu.bo',
            'contrasena' => bcrypt('oldpassword123'),
            'activo' => true,
        ]);

        $payload = [
            'fullName' => 'Ana Patricia Torrico',
            'email' => 'ana.torrico@umss.edu.bo',
            'roles' => ['DOCENTE'],
            'newPassword' => 'NewPassword123!',
        ];

        $response = $this->putJson("/api/academic-users/{$user->id}", $payload);

        $response
            ->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Usuario actualizado correctamente',
            ]);

        $user->refresh();
        $this->assertTrue(\Illuminate\Support\Facades\Hash::check('NewPassword123!', $user->contrasena));
    }

    public function test_update_returns_404_when_user_not_found(): void
    {
        $payload = [
            'fullName' => 'No Existe',
            'email' => 'no.existe@umss.edu.bo',
            'roles' => ['DOCENTE'],
        ];

        $response = $this->putJson('/api/academic-users/99999', $payload);

        $response
            ->assertStatus(404)
            ->assertJson([
                'success' => false,
                'message' => 'Usuario no encontrado',
            ]);
    }

    public function test_update_validates_required_fields(): void
    {
        $payload = [
            'fullName' => '',
            'email' => 'invalido',
            'roles' => ['ROL_INVALIDO'],
            'newPassword' => '123',
        ];

        $response = $this->putJson('/api/academic-users/1', $payload);

        $response
            ->assertStatus(422)
            ->assertJsonValidationErrors(['fullName', 'email', 'roles.0', 'newPassword']);
    }
}
