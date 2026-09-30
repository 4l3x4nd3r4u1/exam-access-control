<?php

namespace Tests\Feature;

use App\Models\Usuario;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;


    public function test_user_can_login_successfully_and_receive_jwt_token(): void
    {
        $user = Usuario::create([
            'nombre' => 'Docente Perez',
            'email' => 'docente@umss.edu.bo',
            'ci' => '123456',
            'contrasena' => bcrypt('password123'),
            'activo' => true,
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
                    'full_name' => 'Docente Perez',
                    'email' => 'docente@umss.edu.bo',
                    'token_type' => 'bearer',
                ],
            ]);


        $this->assertNotNull(
            $response->json('data.token')
        );
    }



    public function test_login_fails_with_invalid_credentials(): void
    {
        Usuario::create([
            'nombre' => 'Docente Perez',
            'email' => 'docente@umss.edu.bo',
            'ci' => '123456',
            'contrasena' => bcrypt('correctPassword'),
            'activo' => true,
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
        Usuario::create([
            'nombre' => 'Docente Inactivo',
            'email' => 'inactivo@umss.edu.bo',
            'ci' => '789456',
            'contrasena' => bcrypt('password123'),
            'activo' => false,
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
            ->assertJsonValidationErrors([
                'email',
                'password'
            ]);
    }
}