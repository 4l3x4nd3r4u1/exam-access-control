<?php

namespace Tests\Unit;

use App\DTOs\RawFileData;
use App\Models\CourseGroup;
use App\Models\Student;
use App\Models\StudentCourseEnrollment;
use App\Models\User;
use App\Modules\CoreDataStorage;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CoreDataStorageTest extends TestCase
{
    use RefreshDatabase;

    private CoreDataStorage $storage;

    protected function setUp(): void
    {
        parent::setUp();
        $this->storage = new CoreDataStorage();
    }

    public function test_imports_valid_csv_roster_successfully(): void
    {
        $csvContent = <<<CSV
codigo_sis,ci,nombre_completo,sigla_materia,nombre_materia,grupo,gestion,email_docente
202100482,8765432,Perez Gomez Juan Carlos,INF110,Introduccion a la Programacion,1,2/2026,docente@umss.edu.bo
202201934,7654321,Rodriguez Lopez Maria Elena,INF110,Introduccion a la Programacion,1,2/2026,docente@umss.edu.bo
CSV;

        $fileData = new RawFileData(
            content: $csvContent,
            fileName: 'sample.csv',
            extension: 'csv'
        );

        $result = $this->storage->importStudentRoster($fileData);

        $this->assertTrue($result->isSuccessful);
        $this->assertEquals(2, $result->totalProcessed);
        $this->assertEquals(2, $result->successful);
        $this->assertEquals(0, $result->skipped);
        $this->assertEmpty($result->observations);

        // Verify Student persistence
        $this->assertDatabaseHas('students', [
            'student_key' => '202100482',
            'ci' => '8765432',
            'full_name' => 'Perez Gomez Juan Carlos',
        ]);
        $this->assertDatabaseHas('students', [
            'student_key' => '202201934',
            'ci' => '7654321',
            'full_name' => 'Rodriguez Lopez Maria Elena',
        ]);

        // Verify CourseGroup persistence
        $this->assertDatabaseHas('course_groups', [
            'course_group_id' => 'INF110-G1-2/2026',
            'subject_code' => 'INF110',
            'subject_name' => 'Introduccion a la Programacion',
            'group_code' => '1',
            'academic_term' => '2/2026',
        ]);

        // Verify Teacher User persistence
        $this->assertDatabaseHas('users', [
            'email' => 'docente@umss.edu.bo',
            'role' => 'TEACHER',
        ]);

        // Verify Enrollment persistence
        $this->assertDatabaseHas('student_course_enrollments', [
            'student_key' => '202100482',
            'course_group_id' => 'INF110-G1-2/2026',
            'status' => 'HABILITADO',
        ]);
    }

    public function test_rejects_unsupported_file_extension(): void
    {
        $fileData = new RawFileData(
            content: 'some text',
            fileName: 'notes.pdf',
            extension: 'pdf'
        );

        $result = $this->storage->importStudentRoster($fileData);

        $this->assertFalse($result->isSuccessful);
        $this->assertStringContainsString('Unsupported file format', $result->observations[0]);
    }

    public function test_detects_missing_column_headers(): void
    {
        $csvContent = <<<CSV
codigo_sis,ci,nombre_completo
202100482,8765432,Perez Gomez Juan Carlos
CSV;

        $fileData = new RawFileData(
            content: $csvContent,
            fileName: 'invalid_headers.csv',
            extension: 'csv'
        );

        $result = $this->storage->importStudentRoster($fileData);

        $this->assertFalse($result->isSuccessful);
        $this->assertStringContainsString('Missing required column headers', $result->observations[0]);
    }

    public function test_handles_rows_with_missing_mandatory_fields(): void
    {
        $csvContent = <<<CSV
codigo_sis,ci,nombre_completo,sigla_materia,nombre_materia,grupo,gestion,email_docente
202100482,8765432,Perez Gomez Juan Carlos,INF110,Introduccion a la Programacion,1,2/2026,docente@umss.edu.bo
,7654321,Sin SIS,INF110,Introduccion a la Programacion,1,2/2026,docente@umss.edu.bo
CSV;

        $fileData = new RawFileData(
            content: $csvContent,
            fileName: 'partial_error.csv',
            extension: 'csv'
        );

        $result = $this->storage->importStudentRoster($fileData);

        $this->assertTrue($result->isSuccessful);
        $this->assertEquals(2, $result->totalProcessed);
        $this->assertEquals(1, $result->successful);
        $this->assertEquals(1, $result->skipped);
        $this->assertCount(1, $result->observations);
        $this->assertStringContainsString('Row 3: Missing student SIS code', $result->observations[0]);
    }

    public function test_detects_malformed_rows_with_column_count_mismatch(): void
    {
        $csvContent = <<<CSV
codigo_sis,ci,nombre_completo,sigla_materia,nombre_materia,grupo,gestion,email_docente
202100482,8765432,Perez Gomez Juan Carlos,INF110,Introduccion a la Programacion,1,2/2026,docente@umss.edu.bo
202201934,7654321,Rodriguez Lopez Maria Elena,1,2/2026
CSV;

        $fileData = new RawFileData(
            content: $csvContent,
            fileName: 'malformed_row.csv',
            extension: 'csv'
        );

        $result = $this->storage->importStudentRoster($fileData);

        $this->assertTrue($result->isSuccessful);
        $this->assertEquals(2, $result->totalProcessed);
        $this->assertEquals(1, $result->successful);
        $this->assertEquals(1, $result->skipped);
        $this->assertCount(1, $result->observations);
        $this->assertStringContainsString('Malformed row. Expected 8 columns, but found 5', $result->observations[0]);
    }
}
