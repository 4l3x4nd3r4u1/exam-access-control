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

    public function test_get_academic_staff_returns_only_active_users_ordered_alphabetically(): void
    {
        // Active users (different roles, unordered)
        User::create([
            'name' => 'Carlos Zapata',
            'email' => 'czapata@umss.edu.bo',
            'password' => bcrypt('password'),
            'role' => 'TEACHER',
            'is_active' => true,
        ]);

        User::create([
            'name' => 'Ana Morales',
            'email' => 'amorales@umss.edu.bo',
            'password' => bcrypt('password'),
            'role' => 'ADMIN',
            'is_active' => true,
        ]);

        User::create([
            'name' => 'Bernardo Rojas',
            'email' => 'brojas@umss.edu.bo',
            'password' => bcrypt('password'),
            'role' => 'ASSISTANT',
            'is_active' => true,
        ]);

        // Inactive user (must NOT appear in results)
        User::create([
            'name' => 'Alberto Desactivado',
            'email' => 'adesactivado@umss.edu.bo',
            'password' => bcrypt('password'),
            'role' => 'TEACHER',
            'is_active' => false,
        ]);

        $staff = $this->storage->getAcademicStaff();

        $this->assertCount(3, $staff);

        // Verify alphabetical order by full name
        $this->assertEquals('Ana Morales', $staff[0]->fullName);
        $this->assertEquals('amorales@umss.edu.bo', $staff[0]->email);
        $this->assertEquals('ADMIN', $staff[0]->role);
        $this->assertTrue($staff[0]->isActive);

        $this->assertEquals('Bernardo Rojas', $staff[1]->fullName);
        $this->assertEquals('brojas@umss.edu.bo', $staff[1]->email);
        $this->assertEquals('ASSISTANT', $staff[1]->role);
        $this->assertTrue($staff[1]->isActive);

        $this->assertEquals('Carlos Zapata', $staff[2]->fullName);
        $this->assertEquals('czapata@umss.edu.bo', $staff[2]->email);
        $this->assertEquals('TEACHER', $staff[2]->role);
        $this->assertTrue($staff[2]->isActive);
    }

    public function test_get_academic_staff_returns_empty_when_no_active_users(): void
    {
        // Only inactive users
        User::create([
            'name' => 'Inactivo User',
            'email' => 'inactivo@umss.edu.bo',
            'password' => bcrypt('password'),
            'role' => 'TEACHER',
            'is_active' => false,
        ]);

        $staff = $this->storage->getAcademicStaff();

        $this->assertIsArray($staff);
        $this->assertEmpty($staff);
    }

    public function test_get_teacher_courses_returns_assigned_courses_with_enrolled_count(): void
    {
        $teacher = User::create([
            'name' => 'Dr. Walter Sanchez',
            'email' => 'wsanchez@umss.edu.bo',
            'password' => bcrypt('password'),
            'role' => 'TEACHER',
            'is_active' => true,
        ]);

        $otherTeacher = User::create([
            'name' => 'Lic. Patricia Rios',
            'email' => 'prios@umss.edu.bo',
            'password' => bcrypt('password'),
            'role' => 'TEACHER',
            'is_active' => true,
        ]);

        // Courses for Dr. Walter Sanchez
        CourseGroup::create([
            'course_group_id' => 'INF110-G1-2/2026',
            'subject_code' => 'INF110',
            'subject_name' => 'Introduccion a la Programacion',
            'group_code' => '1',
            'academic_term' => '2/2026',
            'teacher_id' => $teacher->id,
        ]);

        CourseGroup::create([
            'course_group_id' => 'INF120-G2-2/2026',
            'subject_code' => 'INF120',
            'subject_name' => 'Estructura de Datos',
            'group_code' => '2',
            'academic_term' => '2/2026',
            'teacher_id' => $teacher->id,
        ]);

        // Course for Lic. Patricia Rios (should not be returned for Walter)
        CourseGroup::create([
            'course_group_id' => 'SIS211-G1-2/2026',
            'subject_code' => 'SIS211',
            'subject_name' => 'Sistemas Operativos',
            'group_code' => '1',
            'academic_term' => '2/2026',
            'teacher_id' => $otherTeacher->id,
        ]);

        // Students & Enrollments
        Student::create(['student_key' => '20210001', 'ci' => '111111', 'full_name' => 'Estudiante Uno']);
        Student::create(['student_key' => '20210002', 'ci' => '222222', 'full_name' => 'Estudiante Dos']);
        Student::create(['student_key' => '20210003', 'ci' => '333333', 'full_name' => 'Estudiante Tres']);

        // 2 students in INF110-G1
        StudentCourseEnrollment::create(['student_key' => '20210001', 'course_group_id' => 'INF110-G1-2/2026', 'status' => 'HABILITADO']);
        StudentCourseEnrollment::create(['student_key' => '20210002', 'course_group_id' => 'INF110-G1-2/2026', 'status' => 'HABILITADO']);

        // 1 student in INF120-G2
        StudentCourseEnrollment::create(['student_key' => '20210003', 'course_group_id' => 'INF120-G2-2/2026', 'status' => 'HABILITADO']);

        $courses = $this->storage->getTeacherCourses($teacher->id);

        $this->assertCount(2, $courses);

        $this->assertEquals('INF110-G1-2/2026', $courses[0]->courseGroupId);
        $this->assertEquals('INF110', $courses[0]->subjectCode);
        $this->assertEquals('Introduccion a la Programacion', $courses[0]->subjectName);
        $this->assertEquals('1', $courses[0]->groupCode);
        $this->assertEquals('2/2026', $courses[0]->academicTerm);
        $this->assertEquals(2, $courses[0]->totalEnrolled);
        $this->assertEquals($teacher->id, $courses[0]->teacherId);

        $this->assertEquals('INF120-G2-2/2026', $courses[1]->courseGroupId);
        $this->assertEquals('INF120', $courses[1]->subjectCode);
        $this->assertEquals('Estructura de Datos', $courses[1]->subjectName);
        $this->assertEquals('2', $courses[1]->groupCode);
        $this->assertEquals('2/2026', $courses[1]->academicTerm);
        $this->assertEquals(1, $courses[1]->totalEnrolled);
        $this->assertEquals($teacher->id, $courses[1]->teacherId);
    }

    public function test_get_teacher_courses_returns_empty_when_teacher_has_no_courses(): void
    {
        $teacher = User::create([
            'name' => 'Docente Sin Materias',
            'email' => 'sinmaterias@umss.edu.bo',
            'password' => bcrypt('password'),
            'role' => 'TEACHER',
            'is_active' => true,
        ]);

        $courses = $this->storage->getTeacherCourses($teacher->id);

        $this->assertIsArray($courses);
        $this->assertEmpty($courses);
    }
}


