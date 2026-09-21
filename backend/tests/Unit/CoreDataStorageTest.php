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
use App\DTOs\UserRegistrationData;
use App\DTOs\UserUpdateData;

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

    public function test_imports_official_template_csv_roster_successfully(): void
    {
        $csvContent = <<<CSV
Docente: Lic. Juan Carlos Perez Gomez
Email Docente: juan.perez@umss.edu.bo
Materia: INF110 - INTRODUCCION A LA PROGRAMACION
Grupo: 1
Gestion: 2/2026

Codigo SIS,CI,Nombre Completo
202001234,7891234,ALVAREZ CLAROS PEDRO
202005678,6543210,BENITEZ LOPEZ CARMEN
CSV;

        $fileData = new RawFileData(
            content: $csvContent,
            fileName: 'nomina_oficial.csv',
            extension: 'csv'
        );

        $result = $this->storage->importStudentRoster($fileData);

        $this->assertTrue($result->isSuccessful);
        $this->assertEquals(2, $result->totalProcessed);
        $this->assertEquals(2, $result->successful);
        $this->assertEquals(0, $result->skipped);
        $this->assertEmpty($result->observations);
        $this->assertEmpty($result->failedRows);
        $this->assertNotNull($result->metadata);
        $this->assertEquals('Lic. Juan Carlos Perez Gomez', $result->metadata['teacherName']);
        $this->assertEquals('juan.perez@umss.edu.bo', $result->metadata['teacherEmail']);
        $this->assertEquals('INF110', $result->metadata['subjectCode']);
        $this->assertEquals('INTRODUCCION A LA PROGRAMACION', $result->metadata['subjectName']);
        $this->assertEquals('1', $result->metadata['groupCode']);
        $this->assertEquals('2/2026', $result->metadata['academicTerm']);

        // Verify Student persistence
        $this->assertDatabaseHas('students', [
            'student_key' => '202001234',
            'ci' => '7891234',
            'full_name' => 'ALVAREZ CLAROS PEDRO',
        ]);

        // Verify CourseGroup persistence
        $this->assertDatabaseHas('course_groups', [
            'course_group_id' => 'INF110-G1-2/2026',
            'subject_code' => 'INF110',
            'subject_name' => 'INTRODUCCION A LA PROGRAMACION',
            'group_code' => '1',
            'academic_term' => '2/2026',
        ]);

        // Verify Teacher User persistence with full name
        $this->assertDatabaseHas('users', [
            'email' => 'juan.perez@umss.edu.bo',
            'name' => 'Lic. Juan Carlos Perez Gomez',
            'role' => 'TEACHER',
        ]);

        // Verify Enrollment persistence
        $this->assertDatabaseHas('student_course_enrollments', [
            'student_key' => '202001234',
            'course_group_id' => 'INF110-G1-2/2026',
            'status' => 'HABILITADO',
        ]);
    }

    public function test_rejects_template_csv_with_missing_metadata(): void
    {
        $csvContent = <<<CSV
Docente: Lic. Juan Carlos Perez Gomez
Materia: INF110 - INTRODUCCION A LA PROGRAMACION
Grupo: 1

Codigo SIS,CI,Nombre Completo
202001234,7891234,ALVAREZ CLAROS PEDRO
CSV;

        $fileData = new RawFileData(
            content: $csvContent,
            fileName: 'incompleto.csv',
            extension: 'csv'
        );

        $result = $this->storage->importStudentRoster($fileData);

        $this->assertFalse($result->isSuccessful);
        $this->assertStringContainsString('Faltan metadatos requeridos', $result->observations[0]);
        $this->assertStringContainsString('Email Docente', $result->observations[0]);
        $this->assertStringContainsString('Gestion', $result->observations[0]);
    }

    public function test_template_csv_handles_invalid_rows_and_returns_failed_rows(): void
    {
        $csvContent = <<<CSV
Docente: Lic. Juan Carlos Perez Gomez
Email Docente: juan.perez@umss.edu.bo
Materia: INF110 - INTRODUCCION A LA PROGRAMACION
Grupo: 1
Gestion: 2/2026

Codigo SIS,CI,Nombre Completo
202001234,7891234,ALVAREZ CLAROS PEDRO
,6543210,BENITEZ SIN SIS
202109876,,CASTRO SIN CI
CSV;

        $fileData = new RawFileData(
            content: $csvContent,
            fileName: 'nomina_con_errores.csv',
            extension: 'csv'
        );

        $result = $this->storage->importStudentRoster($fileData);

        $this->assertTrue($result->isSuccessful);
        $this->assertEquals(3, $result->totalProcessed);
        $this->assertEquals(1, $result->successful);
        $this->assertEquals(2, $result->skipped);
        $this->assertCount(2, $result->failedRows);

        // Check failed rows detail
        $this->assertEquals(9, $result->failedRows[0]['rowNumber']);
        $this->assertStringContainsString('Falta Código SIS', $result->failedRows[0]['reason']);
        $this->assertEquals('BENITEZ SIN SIS', $result->failedRows[0]['data']['nombre_completo']);

        $this->assertEquals(10, $result->failedRows[1]['rowNumber']);
        $this->assertStringContainsString('Falta CI', $result->failedRows[1]['reason']);

        // Check valid student is saved
        $this->assertDatabaseHas('students', [
            'student_key' => '202001234',
            'ci' => '7891234',
        ]);
    }

    public function test_generates_csv_template_content(): void
    {
        $template = $this->storage->generateCsvTemplate();

        $this->assertStringContainsString('Docente:', $template);
        $this->assertStringContainsString('Email Docente:', $template);
        $this->assertStringContainsString('Materia:', $template);
        $this->assertStringContainsString('Grupo:', $template);
        $this->assertStringContainsString('Gestion:', $template);
        $this->assertStringContainsString('Codigo SIS,CI,Nombre Completo', $template);
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
col1,col2,col3
val1,val2,val3
CSV;

        $fileData = new RawFileData(
            content: $csvContent,
            fileName: 'invalid_headers.csv',
            extension: 'csv'
        );

        $result = $this->storage->importStudentRoster($fileData);

        $this->assertFalse($result->isSuccessful);
        $this->assertNotEmpty($result->observations);
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

 public function test_register_academic_user_successfully(): void
{
    $data = new UserRegistrationData(
        fullName: 'Juan Perez',
        email: 'juan.perez@umss.edu.bo',
        password: 'password123',
        role: 'DOCENTE'
    );

    $result = $this->storage->registerAcademicUser($data);

    $this->assertTrue($result->isSuccessful);
    $this->assertEquals(
        'Usuario registrado correctamente',
        $result->message
    );

    $this->assertDatabaseHas('users', [
        'email' => 'juan.perez@umss.edu.bo',
        'role' => 'TEACHER',
        'is_active' => true,
    ]);
}

public function test_register_academic_user_rejects_invalid_email_domain(): void
{
    $data = new UserRegistrationData(
        fullName: 'Juan Perez',
        email: 'juan@gmail.com',
        password: 'password123',
        role: 'DOCENTE'
    );

    $result = $this->storage->registerAcademicUser($data);

    $this->assertFalse($result->isSuccessful);

    $this->assertStringContainsString(
        '@umss.edu.bo',
        $result->message
    );
}

public function test_register_academic_user_rejects_existing_email(): void
{
    User::create([
        'name' => 'Usuario Existente',
        'email' => 'existente@umss.edu.bo',
        'password' => bcrypt('password123'),
        'role' => 'TEACHER',
        'is_active' => true,
    ]);

    $data = new UserRegistrationData(
        fullName: 'Nuevo Usuario',
        email: 'existente@umss.edu.bo',
        password: 'password123',
        role: 'DOCENTE'
    );

    $result = $this->storage->registerAcademicUser($data);

    $this->assertFalse($result->isSuccessful);
    $this->assertEquals(
        'El correo ya está registrado',
        $result->message
    );
}

    public function test_get_processed_rosters_returns_all_rosters_with_student_count(): void
{
    $teacher = User::create([
        'name' => 'Walter Sanchez',
        'email' => 'wsanchez@umss.edu.bo',
        'password' => bcrypt('password'),
        'role' => 'TEACHER',
        'is_active' => true,
    ]);

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

    Student::create([
        'student_key' => '20210001',
        'ci' => '111111',
        'full_name' => 'Student One',
    ]);

    Student::create([
        'student_key' => '20210002',
        'ci' => '222222',
        'full_name' => 'Student Two',
    ]);

    StudentCourseEnrollment::create([
        'student_key' => '20210001',
        'course_group_id' => 'INF110-G1-2/2026',
        'status' => 'HABILITADO',
    ]);

    StudentCourseEnrollment::create([
        'student_key' => '20210002',
        'course_group_id' => 'INF110-G1-2/2026',
        'status' => 'HABILITADO',
    ]);

    $rosters = $this->storage->getProcessedRosters();

    $this->assertCount(2, $rosters);

    $this->assertEquals('INF110-G1-2/2026', $rosters[0]->courseGroupId);
    $this->assertEquals('INF110', $rosters[0]->subjectCode);
    $this->assertEquals('Introduccion a la Programacion', $rosters[0]->subjectName);
    $this->assertEquals('1', $rosters[0]->groupCode);
    $this->assertEquals('2/2026', $rosters[0]->academicTerm);
    $this->assertEquals(2, $rosters[0]->totalStudents);

    $this->assertEquals('INF120-G2-2/2026', $rosters[1]->courseGroupId);
    $this->assertEquals(0, $rosters[1]->totalStudents);
} 

    public function test_get_processed_rosters_returns_empty_array_when_no_rosters_exist(): void
    {
        $rosters = $this->storage->getProcessedRosters();

        $this->assertIsArray($rosters);
        $this->assertEmpty($rosters);
    }

    public function test_update_academic_user_successfully(): void
    {
        $user = User::create([
            'name' => 'Carlos Morales',
            'email' => 'carlos.morales@umss.edu.bo',
            'password' => bcrypt('oldpassword123'),
            'role' => 'TEACHER',
            'is_active' => true,
        ]);

        $updateData = new UserUpdateData(
            fullName: 'Carlos Morales Modificado',
            email: 'carlos.m@umss.edu.bo',
            role: 'DOCENTE',
            newPassword: null
        );

        $result = $this->storage->updateAcademicUser($user->id, $updateData);

        $this->assertTrue($result->isSuccessful);
        $this->assertEquals('Usuario actualizado correctamente', $result->message);

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'name' => 'Carlos Morales Modificado',
            'email' => 'carlos.m@umss.edu.bo',
            'role' => 'TEACHER',
        ]);
    }

    public function test_update_academic_user_with_new_password_successfully(): void
    {
        $user = User::create([
            'name' => 'Ana Torrico',
            'email' => 'ana.torrico@umss.edu.bo',
            'password' => bcrypt('oldpassword123'),
            'role' => 'ASSISTANT',
            'is_active' => true,
        ]);

        $updateData = new UserUpdateData(
            fullName: 'Ana Patricia Torrico',
            email: 'ana.torrico@umss.edu.bo',
            role: 'DOCENTE',
            newPassword: 'NewSecurePassword123'
        );

        $result = $this->storage->updateAcademicUser($user->id, $updateData);

        $this->assertTrue($result->isSuccessful);
        $this->assertEquals('Usuario actualizado correctamente', $result->message);

        $user->refresh();
        $this->assertEquals('Ana Patricia Torrico', $user->name);
        $this->assertEquals('TEACHER', $user->role);
        $this->assertTrue(\Illuminate\Support\Facades\Hash::check('NewSecurePassword123', $user->password));
    }

    public function test_update_academic_user_returns_error_when_user_not_found(): void
    {
        $updateData = new UserUpdateData(
            fullName: 'Inexistente',
            email: 'inexistente@umss.edu.bo',
            role: 'DOCENTE'
        );

        $result = $this->storage->updateAcademicUser(99999, $updateData);

        $this->assertFalse($result->isSuccessful);
        $this->assertEquals('Usuario no encontrado', $result->message);
    }

    public function test_update_academic_user_rejects_invalid_email_domain(): void
    {
        $user = User::create([
            'name' => 'Docente Prueba',
            'email' => 'prueba@umss.edu.bo',
            'password' => bcrypt('password123'),
            'role' => 'TEACHER',
            'is_active' => true,
        ]);

        $updateData = new UserUpdateData(
            fullName: 'Docente Prueba',
            email: 'prueba@gmail.com',
            role: 'DOCENTE'
        );

        $result = $this->storage->updateAcademicUser($user->id, $updateData);

        $this->assertFalse($result->isSuccessful);
        $this->assertStringContainsString('@umss.edu.bo', $result->message);
    }

    public function test_update_academic_user_rejects_email_used_by_another_user(): void
    {
        User::create([
            'name' => 'Usuario Uno',
            'email' => 'usuario.uno@umss.edu.bo',
            'password' => bcrypt('password123'),
            'role' => 'TEACHER',
            'is_active' => true,
        ]);

        $userTwo = User::create([
            'name' => 'Usuario Dos',
            'email' => 'usuario.dos@umss.edu.bo',
            'password' => bcrypt('password123'),
            'role' => 'TEACHER',
            'is_active' => true,
        ]);

        $updateData = new UserUpdateData(
            fullName: 'Usuario Dos Modificado',
            email: 'usuario.uno@umss.edu.bo',
            role: 'DOCENTE'
        );

        $result = $this->storage->updateAcademicUser($userTwo->id, $updateData);

        $this->assertFalse($result->isSuccessful);
        $this->assertEquals('El correo ya está registrado por otro usuario', $result->message);
    }
}


