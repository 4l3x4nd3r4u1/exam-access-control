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
codigo_sis,ci,nombre_completo,sigla_materia,nombre_materia,grupo,gestion,email_docente
202100482,8765432,Perez Gomez Juan Carlos,INF110,Introduccion a la Programacion,1,2/2026,docente@umss.edu.bo
202201934,7654321,Rodriguez Lopez Maria Elena,INF110,Introduccion a la Programacion,1,2/2026,docente@umss.edu.bo
CSV;

        $file = UploadedFile::fake()->createWithContent('sample.csv', $csvContent);

        $response = $this->postJson('/api/students/import', [
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
                ],
            ]);
    }
}
