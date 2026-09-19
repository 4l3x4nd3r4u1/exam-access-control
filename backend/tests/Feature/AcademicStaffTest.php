<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AcademicStaffTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_list_active_academic_staff_ordered_alphabetically(): void
    {
        User::create([
            'name' => 'Zulma Quispe',
            'email' => 'zquispe@umss.edu.bo',
            'password' => bcrypt('password'),
            'role' => 'TEACHER',
            'is_active' => true,
        ]);

        User::create([
            'name' => 'Adrian Mendez',
            'email' => 'amendez@umss.edu.bo',
            'password' => bcrypt('password'),
            'role' => 'ADMIN',
            'is_active' => true,
        ]);

        User::create([
            'name' => 'Mario Inactivo',
            'email' => 'minactivo@umss.edu.bo',
            'password' => bcrypt('password'),
            'role' => 'TEACHER',
            'is_active' => false,
        ]);

        $response = $this->getJson('/api/academic-staff');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Personal académico obtenido exitosamente.',
            ])
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.full_name', 'Adrian Mendez')
            ->assertJsonPath('data.0.email', 'amendez@umss.edu.bo')
            ->assertJsonPath('data.0.role', 'ADMIN')
            ->assertJsonPath('data.0.is_active', true)
            ->assertJsonPath('data.1.full_name', 'Zulma Quispe')
            ->assertJsonPath('data.1.email', 'zquispe@umss.edu.bo')
            ->assertJsonPath('data.1.role', 'TEACHER')
            ->assertJsonPath('data.1.is_active', true);
    }

    public function test_can_register_new_academic_staff_with_valid_institutional_email(): void
    {
        $payload = [
            'name' => 'Carlos Perez',
            'email' => 'cperez@fcyt.umss.edu.bo',
            'password' => 'secret123',
            'role' => 'TEACHER',
        ];

        $response = $this->postJson('/api/academic-staff', $payload);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'message' => 'Personal académico registrado exitosamente.',
                'data' => [
                    'full_name' => 'Carlos Perez',
                    'email' => 'cperez@fcyt.umss.edu.bo',
                    'role' => 'TEACHER',
                    'is_active' => true,
                ],
            ]);

        $this->assertDatabaseHas('users', [
            'email' => 'cperez@fcyt.umss.edu.bo',
            'name' => 'Carlos Perez',
            'role' => 'TEACHER',
            'is_active' => true,
        ]);
    }

    public function test_cannot_register_academic_staff_with_non_institutional_email(): void
    {
        $payload = [
            'name' => 'Juan Perez',
            'email' => 'jperez@gmail.com',
            'password' => 'secret123',
            'role' => 'TEACHER',
        ];

        $response = $this->postJson('/api/academic-staff', $payload);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_cannot_register_academic_staff_with_duplicate_email(): void
    {
        User::create([
            'name' => 'Existente',
            'email' => 'existente@umss.edu.bo',
            'password' => bcrypt('password'),
            'role' => 'TEACHER',
            'is_active' => true,
        ]);

        $payload = [
            'name' => 'Duplicado',
            'email' => 'existente@umss.edu.bo',
            'password' => 'secret123',
            'role' => 'ADMIN',
        ];

        $response = $this->postJson('/api/academic-staff', $payload);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }
}
