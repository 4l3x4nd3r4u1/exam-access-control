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
}
