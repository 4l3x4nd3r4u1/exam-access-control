<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class StudentRosterImportTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    protected function getAuthHeaders(): array
    {
        $user = User::where('email', 'ana.morales@umss.edu.bo')->first();
        $token = JWTAuth::fromUser($user);
        return [
            'Authorization' => 'Bearer ' . $token,
        ];
    }

    protected function getAuthToken(): string
    {
        $user = User::where('email', 'ana.morales@umss.edu.bo')->first();
        return JWTAuth::fromUser($user);
    }

    public function test_import_valid_csv()
    {
        Storage::fake('local');

        $csvContent = "Docente: Ana Morales Gutiérrez\n" .
            "Email Docente: ana.morales@umss.edu.bo\n" .
            "Materia: INF110 - INTRODUCCION A LA PROGRAMACION\n" .
            "Grupo: 1\n" .
            "Gestion: 2/2026\n\n" .
            "Codigo SIS,CI,Nombre Completo\n" .
            "202600001,7800001,BENITEZ REYES ANDRES\n" .
            "202600002,7800002,QUISPE PEREZ PATRICIA\n";

        $file = UploadedFile::fake()->createWithContent('roster.csv', $csvContent);

        $response = $this->withHeaders($this->getAuthHeaders())
            ->post('/api/student-roster/import', [
                'file' => $file,
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true);
    }

    public function test_template_download()
    {
        $response = $this->withHeaders($this->getAuthHeaders())
            ->get('/api/student-roster/template');

        $response->assertStatus(200)
            ->assertHeader('Content-Type', 'text/csv; charset=UTF-8')
            ->assertHeader('Content-Disposition', 'attachment; filename="plantilla_nomina_estudiantes.csv"');
    }
}
