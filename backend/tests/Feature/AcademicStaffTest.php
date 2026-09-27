<?php

namespace Tests\Feature;

use App\Models\Usuario;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AcademicStaffTest extends TestCase
{
    use RefreshDatabase;


    public function test_can_list_active_academic_staff_ordered_alphabetically(): void
    {

        Usuario::create([
            'nombre' => 'Zulma Quispe',
            'email' => 'zquispe@umss.edu.bo',
            'ci' => '1111111',
            'contrasena' => bcrypt('password'),
            'activo' => true,
        ]);


        Usuario::create([
            'nombre' => 'Adrian Mendez',
            'email' => 'amendez@umss.edu.bo',
            'ci' => '2222222',
            'contrasena' => bcrypt('password'),
            'activo' => true,
        ]);


        Usuario::create([
            'nombre' => 'Mario Inactivo',
            'email' => 'minactivo@umss.edu.bo',
            'ci' => '3333333',
            'contrasena' => bcrypt('password'),
            'activo' => false,
        ]);



        $response = $this->getJson('/api/academic-staff');


        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Personal académico obtenido exitosamente.',
            ])
            ->assertJsonCount(2, 'data')

            ->assertJsonPath(
                'data.0.full_name',
                'Adrian Mendez'
            )

            ->assertJsonPath(
                'data.0.email',
                'amendez@umss.edu.bo'
            )

            ->assertJsonPath(
                'data.0.is_active',
                true
            )

            ->assertJsonPath(
                'data.1.full_name',
                'Zulma Quispe'
            )

            ->assertJsonPath(
                'data.1.email',
                'zquispe@umss.edu.bo'
            )

            ->assertJsonPath(
                'data.1.is_active',
                true
            );
    }
}