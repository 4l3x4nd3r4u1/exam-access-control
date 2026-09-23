<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class StudentRosterImportTest extends TestCase
{
    use RefreshDatabase;
    public function test_uploads_and_imports_csv_roster_via_http(): void
    {
        $csvContent = <<<CSV
Docente: Lic. Juan Carlos Perez Gomez
Email Docente: juan.perez@umss.edu.bo
Materia: INF110 - INTRODUCCION A LA PROGRAMACION
Grupo: 1
Gestion: 2/2026

Codigo SIS,CI,Nombre Completo
202100482,8765432,Perez Gomez Juan Carlos
202201934,7654321,Rodriguez Lopez Maria Elena
CSV;

        $file = UploadedFile::fake()->createWithContent('sample.csv', $csvContent);

        $response = $this->postJson('/api/courses/import-roster', [
            'file' => $file,
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'totalProcessed' => 2,
                    'successful' => 2,
                    'skipped' => 0,
                    'isSuccessful' => true,
                    'failedRows' => [],
                ],
            ]);
    }

    public function test_reports_failed_rows_on_partial_errors_via_http(): void
    {
        $csvContent = <<<CSV
Docente: Lic. Juan Carlos Perez Gomez
Email Docente: juan.perez@umss.edu.bo
Materia: INF110 - INTRODUCCION A LA PROGRAMACION
Grupo: 1
Gestion: 2/2026

Codigo SIS,CI,Nombre Completo
202100482,8765432,Perez Gomez Juan Carlos
,7654321,Sin SIS Estudiante
CSV;

        $file = UploadedFile::fake()->createWithContent('partial.csv', $csvContent);

        $response = $this->postJson('/api/students/import', [
            'file' => $file,
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'totalProcessed' => 2,
                    'successful' => 1,
                    'skipped' => 1,
                    'isSuccessful' => true,
                ],
            ]);

        $responseData = $response->json('data');
        $this->assertCount(1, $responseData['failedRows']);
        $this->assertEquals(9, $responseData['failedRows'][0]['rowNumber']);
        $this->assertEquals('Sin SIS Estudiante', $responseData['failedRows'][0]['data']['nombre_completo']);
    }

    public function test_downloads_official_roster_template_via_http(): void
    {
        $response = $this->get('/api/courses/roster-template');

        $response->assertStatus(200);
        $response->assertHeader('Content-Type', 'text/csv; charset=UTF-8');
        $this->assertStringContainsString('Docente:', $response->getContent());
        $this->assertStringContainsString('Codigo SIS,CI,Nombre Completo', $response->getContent());
    }
}
