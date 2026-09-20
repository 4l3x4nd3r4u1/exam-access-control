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
            'role' => 'DOCENTE',
        ];

        $response = $this->postJson('/api/academic-users', $payload);

        $response
            ->assertStatus(201)
            ->assertJson([
                'success' => true,
                'message' => 'Usuario registrado correctamente',
            ]);

        $this->assertDatabaseHas('users', [
            'name' => 'Mariana Rios',
            'email' => 'mariana.rios@umss.edu.bo',
            'role' => 'TEACHER',
        ]);
    }

    public function test_can_update_academic_user(): void
    {
        $user = User::create([
            'name' => 'Carlos Morales',
            'email' => 'carlos.morales@umss.edu.bo',
            'password' => bcrypt('password123'),
            'role' => 'TEACHER',
            'is_active' => true,
        ]);

        $payload = [
            'fullName' => 'Carlos Morales Modificado',
            'email' => 'carlos.m@umss.edu.bo',
            'role' => 'DOCENTE',
        ];

        $response = $this->putJson("/api/academic-users/{$user->id}", $payload);

        $response
            ->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Usuario actualizado correctamente',
            ]);

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'name' => 'Carlos Morales Modificado',
            'email' => 'carlos.m@umss.edu.bo',
            'role' => 'TEACHER',
        ]);
    }

    public function test_can_update_academic_user_with_new_password(): void
    {
        $user = User::create([
            'name' => 'Ana Torrico',
            'email' => 'ana.torrico@umss.edu.bo',
            'password' => bcrypt('oldpassword123'),
            'role' => 'ASSISTANT',
            'is_active' => true,
        ]);

        $payload = [
            'fullName' => 'Ana Patricia Torrico',
            'email' => 'ana.torrico@umss.edu.bo',
            'role' => 'DOCENTE',
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
        $this->assertTrue(\Illuminate\Support\Facades\Hash::check('NewPassword123!', $user->password));
    }

    public function test_update_returns_404_when_user_not_found(): void
    {
        $payload = [
            'fullName' => 'No Existe',
            'email' => 'no.existe@umss.edu.bo',
            'role' => 'DOCENTE',
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
            'role' => 'ROL_INVALIDO',
            'newPassword' => '123',
        ];

        $response = $this->putJson('/api/academic-users/1', $payload);

        $response
            ->assertStatus(422)
            ->assertJsonValidationErrors(['fullName', 'email', 'role', 'newPassword']);
    }
}
