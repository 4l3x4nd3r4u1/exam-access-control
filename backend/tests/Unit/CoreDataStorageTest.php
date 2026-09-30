<?php

namespace Tests\Unit;

use App\Modules\CoreDataStorage;
use App\DTOs\RawFileData;
use App\Models\Usuario;
use App\Models\Estudiante;
use App\Models\Materia;
use App\Models\MateriaGrupo;
use App\Models\EstadoInscripcion;
use App\Models\Inscripcion;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\DTOs\UserRegistrationData;
use App\DTOs\UserUpdateData;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

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

    /*
     * Usuario docente creado por la importación
     */
        $this->assertDatabaseHas('usuario', [
            'email' => 'docente@umss.edu.bo',
        ]);

    /*
     * Estudiantes importados
     */
        $this->assertDatabaseHas('estudiante', [
            'codigo_sis' => '202100482',
        ]);

        $this->assertDatabaseHas('estudiante', [
            'codigo_sis' => '202201934',
        ]);

    /*
     * Materia creada
     */
        $this->assertDatabaseHas('materia', [
            'sigla' => 'INF110',
            'nombre' => 'Introduccion a la Programacion',
        ]);

    /*
     * Grupo de materia creado
     */
        $this->assertDatabaseHas('materia_grupo', [
            'grupo' => '1',
            'gestion' => '2/2026',
        ]);

    /*
     * Estado de inscripción
     */
        $estado = \App\Models\EstadoInscripcion::where(
            'nombre',
            'HABILITADO'
        )->first();

        $this->assertNotNull($estado);

    /*
     * Inscripciones creadas
     */
        $this->assertDatabaseHas('inscripcion', [
            'estado_inscripcion_id' => $estado->id,
            'motivo_inhabilitacion' => null,
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

        $this->assertEquals(
            'Lic. Juan Carlos Perez Gomez',
            $result->metadata['teacherName']
        );

        $this->assertEquals(
            'juan.perez@umss.edu.bo',
            $result->metadata['teacherEmail']
        );

        $this->assertEquals(
            'INF110',
            $result->metadata['subjectCode']
        );

        $this->assertEquals(
            'INTRODUCCION A LA PROGRAMACION',
            $result->metadata['subjectName']
        );

        $this->assertEquals(
            '1',
            $result->metadata['groupCode']
        );

        $this->assertEquals(
            '2/2026',
            $result->metadata['academicTerm']
        );



    /*
     * Docente importado
     */
        $this->assertDatabaseHas('usuario', [
            'email' => 'juan.perez@umss.edu.bo',
            'nombre' => 'Lic. Juan Carlos Perez Gomez',
        ]);



    /*
     * Estudiantes importados
     */
        $this->assertDatabaseHas('estudiante', [
            'codigo_sis' => '202001234',
        ]);

        $this->assertDatabaseHas('estudiante', [
            'codigo_sis' => '202005678',
        ]);



    /*
     * Materia creada
     */
        $this->assertDatabaseHas('materia', [
            'sigla' => 'INF110',
            'nombre' => 'INTRODUCCION A LA PROGRAMACION',
        ]);



    /*
     * Grupo creado
     */
        $this->assertDatabaseHas('materia_grupo', [
            'grupo' => '1',
            'gestion' => '2/2026',
        ]);



    /*
     * Estado de inscripción
     */
        $estado = \App\Models\EstadoInscripcion::where(
            'nombre',
            'HABILITADO'
        )->first();


        $this->assertNotNull($estado);



    /*
     * Inscripciones creadas
     */
        $this->assertDatabaseHas('inscripcion', [
            'estado_inscripcion_id' => $estado->id,
            'motivo_inhabilitacion' => null,
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

            $this->assertNotEmpty($result->observations);


            $observation = $result->observations[0];


            $this->assertStringContainsString(
               'Faltan metadatos requeridos',
                $observation
            );

            $this->assertStringContainsString(
               'Email Docente',
                $observation
            );

            $this->assertStringContainsString(
               'Gestion',
                $observation
            );
        }

    public function test_imports_official_xlsx_roster_with_the_same_result_as_csv(): void
{
    $content = $this->makeXlsxContent([
        ['Docente: Lic. Ana Morales'],
        ['Email Docente: ana.morales@umss.edu.bo'],
        ['Materia: INF110 - INTRODUCCION A LA PROGRAMACION'],
        ['Grupo: 2'],
        ['Gestion: 2/2026'],
        [],
        ['Codigo SIS', 'CI', 'Nombre Completo'],
        ['202600001', '7891234', 'ALVAREZ CLAROS PEDRO'],
        ['', '6543210', 'BENITEZ SIN SIS'],
        ['202600003', '', 'CASTRO SIN CI'],
    ]);


    $result = $this->storage->importStudentRoster(new RawFileData(
        content: $content,
        fileName: 'nomina.xlsx',
        extension: 'xlsx'
    ));



    $this->assertTrue($result->isSuccessful);
    $this->assertEquals(3, $result->totalProcessed);
    $this->assertEquals(1, $result->successful);
    $this->assertEquals(2, $result->skipped);

    $this->assertCount(
        2,
        $result->failedRows
    );


    $this->assertEquals(
        9,
        $result->failedRows[0]['rowNumber']
    );


    $this->assertEquals(
        'BENITEZ SIN SIS',
        $result->failedRows[0]['data']['nombre_completo']
    );


    $this->assertEquals(
        'Lic. Ana Morales',
        $result->metadata['teacherName']
    );



    // Verificar estudiante importado
    $this->assertDatabaseHas('estudiante', [
        'codigo_sis' => '202600001',
    ]);
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

    $this->assertEquals(
        3,
        $result->totalProcessed
    );

    $this->assertEquals(
        1,
        $result->successful
    );

    $this->assertEquals(
        2,
        $result->skipped
    );

    $this->assertCount(
        2,
        $result->failedRows
    );



    // Fila sin Código SIS
    $this->assertEquals(
        9,
        $result->failedRows[0]['rowNumber']
    );

    $this->assertStringContainsString(
        'Falta Código SIS',
        $result->failedRows[0]['reason']
    );

    $this->assertEquals(
        'BENITEZ SIN SIS',
        $result->failedRows[0]['data']['nombre_completo']
    );



    // Fila sin CI
    $this->assertEquals(
        10,
        $result->failedRows[1]['rowNumber']
    );

    $this->assertStringContainsString(
        'Falta CI',
        $result->failedRows[1]['reason']
    );



    // Verificar estudiante válido guardado
    $this->assertDatabaseHas('estudiante', [
        'codigo_sis' => '202001234',
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

    $this->assertEquals(
        2,
        $result->totalProcessed
    );

    $this->assertEquals(
        1,
        $result->successful
    );

    $this->assertEquals(
        1,
        $result->skipped
    );

    $this->assertCount(
        1,
        $result->observations
    );

    $this->assertStringContainsString(
        'Falta codigo sis del estudiante (codigo_sis).',
        $result->observations[0]
    );
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
    $usuarioCarlos = Usuario::create([
        'nombre' => 'Carlos Zapata',
        'email' => 'czapata@umss.edu.bo',
        'ci' => '111111',
        'contrasena' => bcrypt('password'),
        'activo' => true,
    ]);


    $usuarioAna = Usuario::create([
        'nombre' => 'Ana Morales',
        'email' => 'amorales@umss.edu.bo',
        'ci' => '222222',
        'contrasena' => bcrypt('password'),
        'activo' => true,
    ]);


    $usuarioBernardo = Usuario::create([
        'nombre' => 'Bernardo Rojas',
        'email' => 'brojas@umss.edu.bo',
        'ci' => '333333',
        'contrasena' => bcrypt('password'),
        'activo' => true,
    ]);


    Usuario::create([
        'nombre' => 'Alberto Desactivado',
        'email' => 'adesactivado@umss.edu.bo',
        'ci' => '444444',
        'contrasena' => bcrypt('password'),
        'activo' => false,
    ]);


    $staff = $this->storage->getAcademicStaff();



    $this->assertCount(
        3,
        $staff
    );



    $this->assertEquals(
        'Ana Morales',
        $staff[0]->fullName
    );

    $this->assertEquals(
        'amorales@umss.edu.bo',
        $staff[0]->email
    );

    $this->assertTrue(
        $staff[0]->isActive
    );



    $this->assertEquals(
        'Bernardo Rojas',
        $staff[1]->fullName
    );

    $this->assertEquals(
        'brojas@umss.edu.bo',
        $staff[1]->email
    );

    $this->assertTrue(
        $staff[1]->isActive
    );



    $this->assertEquals(
        'Carlos Zapata',
        $staff[2]->fullName
    );

    $this->assertEquals(
        'czapata@umss.edu.bo',
        $staff[2]->email
    );

    $this->assertTrue(
        $staff[2]->isActive
    );
}

    public function test_get_academic_staff_returns_empty_when_no_active_users(): void
{
    Usuario::create([
        'nombre' => 'Inactivo User',
        'email' => 'inactivo@umss.edu.bo',
        'ci' => '999999',
        'contrasena' => bcrypt('password'),
        'activo' => false,
    ]);


    $staff = $this->storage->getAcademicStaff();



    $this->assertIsArray($staff);

    $this->assertEmpty($staff);
}

   public function test_get_teacher_courses_returns_assigned_courses_with_enrolled_count(): void
{
    $teacher = Usuario::create([
        'nombre' => 'Dr. Walter Sanchez',
        'email' => 'wsanchez@umss.edu.bo',
        'ci' => '111111',
        'contrasena' => bcrypt('password'),
        'activo' => true,
    ]);


    $otherTeacher = Usuario::create([
        'nombre' => 'Lic. Patricia Rios',
        'email' => 'prios@umss.edu.bo',
        'ci' => '222222',
        'contrasena' => bcrypt('password'),
        'activo' => true,
    ]);



    $materiaInf110 = Materia::create([
        'sigla' => 'INF110',
        'nombre' => 'Introduccion a la Programacion',
        'activo' => true,
    ]);


    $materiaInf120 = Materia::create([
        'sigla' => 'INF120',
        'nombre' => 'Estructura de Datos',
        'activo' => true,
    ]);


    $materiaSis211 = Materia::create([
        'sigla' => 'SIS211',
        'nombre' => 'Sistemas Operativos',
        'activo' => true,
    ]);



    $grupoInf110 = MateriaGrupo::create([
        'materia_id' => $materiaInf110->id,
        'grupo' => '1',
        'gestion' => '2/2026',
        'docente_id' => $teacher->id,
        'activo' => true,
    ]);


    $grupoInf120 = MateriaGrupo::create([
        'materia_id' => $materiaInf120->id,
        'grupo' => '2',
        'gestion' => '2/2026',
        'docente_id' => $teacher->id,
        'activo' => true,
    ]);


    MateriaGrupo::create([
        'materia_id' => $materiaSis211->id,
        'grupo' => '1',
        'gestion' => '2/2026',
        'docente_id' => $otherTeacher->id,
        'activo' => true,
    ]);



    $usuarioEstudiante1 = Usuario::create([
        'nombre' => 'Estudiante Uno',
        'email' => '111111@estudiante.umss.edu.bo',
        'ci' => '1111111',
        'contrasena' => bcrypt('password'),
        'activo' => true,
    ]);


    $usuarioEstudiante2 = Usuario::create([
        'nombre' => 'Estudiante Dos',
        'email' => '222222@estudiante.umss.edu.bo',
        'ci' => '2222222',
        'contrasena' => bcrypt('password'),
        'activo' => true,
    ]);


    $usuarioEstudiante3 = Usuario::create([
        'nombre' => 'Estudiante Tres',
        'email' => '333333@estudiante.umss.edu.bo',
        'ci' => '3333333',
        'contrasena' => bcrypt('password'),
        'activo' => true,
    ]);



    Estudiante::create([
        'codigo_sis' => '20210001',
        'usuario_id' => $usuarioEstudiante1->id,
    ]);


    Estudiante::create([
        'codigo_sis' => '20210002',
        'usuario_id' => $usuarioEstudiante2->id,
    ]);


    Estudiante::create([
        'codigo_sis' => '20210003',
        'usuario_id' => $usuarioEstudiante3->id,
    ]);



    $estado = EstadoInscripcion::create([
        'nombre' => 'HABILITADO',
        'descripcion' => 'Estudiante habilitado para rendir examen',
    ]);



    Inscripcion::create([
        'usuario_id' => $usuarioEstudiante1->id,
        'materia_grupo_id' => $grupoInf110->id,
        'estado_inscripcion_id' => $estado->id,
        'motivo_inhabilitacion' => null,
        'fecha_inscripcion' => now(),
    ]);


    Inscripcion::create([
        'usuario_id' => $usuarioEstudiante2->id,
        'materia_grupo_id' => $grupoInf110->id,
        'estado_inscripcion_id' => $estado->id,
        'motivo_inhabilitacion' => null,
        'fecha_inscripcion' => now(),
    ]);


    Inscripcion::create([
        'usuario_id' => $usuarioEstudiante3->id,
        'materia_grupo_id' => $grupoInf120->id,
        'estado_inscripcion_id' => $estado->id,
        'motivo_inhabilitacion' => null,
        'fecha_inscripcion' => now(),
    ]);



    $courses = $this->storage->getTeacherCourses($teacher->id);



    $this->assertCount(
        2,
        $courses
    );



    $this->assertEquals(
        $grupoInf110->id,
        $courses[0]->courseGroupId
    );

    $this->assertEquals(
        'INF110',
        $courses[0]->subjectCode
    );

    $this->assertEquals(
        'Introduccion a la Programacion',
        $courses[0]->subjectName
    );

    $this->assertEquals(
        '1',
        $courses[0]->groupCode
    );

    $this->assertEquals(
        '2/2026',
        $courses[0]->academicTerm
    );

    $this->assertEquals(
        2,
        $courses[0]->totalEnrolled
    );

    $this->assertEquals(
        $teacher->id,
        $courses[0]->teacherId
    );



    $this->assertEquals(
        $grupoInf120->id,
        $courses[1]->courseGroupId
    );

    $this->assertEquals(
        'INF120',
        $courses[1]->subjectCode
    );

    $this->assertEquals(
        'Estructura de Datos',
        $courses[1]->subjectName
    );

    $this->assertEquals(
        '2',
        $courses[1]->groupCode
    );

    $this->assertEquals(
        '2/2026',
        $courses[1]->academicTerm
    );

    $this->assertEquals(
        1,
        $courses[1]->totalEnrolled
    );

    $this->assertEquals(
        $teacher->id,
        $courses[1]->teacherId
    );
}

   public function test_get_teacher_courses_returns_empty_when_teacher_has_no_courses(): void
{
    $teacher = Usuario::create([
        'nombre' => 'Docente Sin Materias',
        'email' => 'sinmaterias@umss.edu.bo',
        'ci' => '555555',
        'contrasena' => bcrypt('password'),
        'activo' => true,
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



    $this->assertTrue(
        $result->isSuccessful
    );


    $this->assertEquals(
        'Usuario registrado correctamente',
        $result->message
    );



    $this->assertDatabaseHas('usuario', [
        'email' => 'juan.perez@umss.edu.bo',
        'nombre' => 'Juan Perez',
        'activo' => true,
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
    Usuario::create([
        'nombre' => 'Usuario Existente',
        'email' => 'existente@umss.edu.bo',
        'ci' => '777777',
        'contrasena' => bcrypt('password123'),
        'activo' => true,
    ]);


    $data = new UserRegistrationData(
        fullName: 'Nuevo Usuario',
        email: 'existente@umss.edu.bo',
        password: 'password123',
        role: 'DOCENTE'
    );


    $result = $this->storage->registerAcademicUser($data);



    $this->assertFalse(
        $result->isSuccessful
    );


    $this->assertEquals(
        'El correo ya está registrado',
        $result->message
    );
}

    public function test_get_processed_rosters_returns_all_rosters_with_student_count(): void
{
    $teacher = Usuario::create([
        'nombre' => 'Walter Sanchez',
        'email' => 'wsanchez@umss.edu.bo',
        'ci' => '111111',
        'contrasena' => bcrypt('password'),
        'activo' => true,
    ]);


    $materiaInf110 = Materia::create([
        'sigla' => 'INF110',
        'nombre' => 'Introduccion a la Programacion',
        'activo' => true,
    ]);


    $materiaInf120 = Materia::create([
        'sigla' => 'INF120',
        'nombre' => 'Estructura de Datos',
        'activo' => true,
    ]);



    $grupoInf110 = MateriaGrupo::create([
        'materia_id' => $materiaInf110->id,
        'grupo' => '1',
        'gestion' => '2/2026',
        'docente_id' => $teacher->id,
        'activo' => true,
    ]);


    $grupoInf120 = MateriaGrupo::create([
        'materia_id' => $materiaInf120->id,
        'grupo' => '2',
        'gestion' => '2/2026',
        'docente_id' => $teacher->id,
        'activo' => true,
    ]);



    $usuarioEstudiante1 = Usuario::create([
        'nombre' => 'Student One',
        'email' => 'student1@umss.edu.bo',
        'ci' => '222222',
        'contrasena' => bcrypt('password'),
        'activo' => true,
    ]);


    $usuarioEstudiante2 = Usuario::create([
        'nombre' => 'Student Two',
        'email' => 'student2@umss.edu.bo',
        'ci' => '333333',
        'contrasena' => bcrypt('password'),
        'activo' => true,
    ]);



    Estudiante::create([
        'codigo_sis' => '20210001',
        'usuario_id' => $usuarioEstudiante1->id,
    ]);


    Estudiante::create([
        'codigo_sis' => '20210002',
        'usuario_id' => $usuarioEstudiante2->id,
    ]);



    $estado = EstadoInscripcion::create([
        'nombre' => 'HABILITADO',
        'descripcion' => 'Estudiante habilitado para rendir examen',
    ]);



    Inscripcion::create([
        'usuario_id' => $usuarioEstudiante1->id,
        'materia_grupo_id' => $grupoInf110->id,
        'estado_inscripcion_id' => $estado->id,
        'motivo_inhabilitacion' => null,
        'fecha_inscripcion' => now(),
    ]);


    Inscripcion::create([
        'usuario_id' => $usuarioEstudiante2->id,
        'materia_grupo_id' => $grupoInf110->id,
        'estado_inscripcion_id' => $estado->id,
        'motivo_inhabilitacion' => null,
        'fecha_inscripcion' => now(),
    ]);



    $rosters = $this->storage->getProcessedRosters();



    $this->assertCount(
        2,
        $rosters
    );



    $this->assertEquals(
        $grupoInf110->id,
        $rosters[0]->courseGroupId
    );

    $this->assertEquals(
        'INF110',
        $rosters[0]->subjectCode
    );

    $this->assertEquals(
        'Introduccion a la Programacion',
        $rosters[0]->subjectName
    );

    $this->assertEquals(
        '1',
        $rosters[0]->groupCode
    );

    $this->assertEquals(
        '2/2026',
        $rosters[0]->academicTerm
    );

    $this->assertEquals(
        2,
        $rosters[0]->totalStudents
    );



    $this->assertEquals(
        $grupoInf120->id,
        $rosters[1]->courseGroupId
    );

    $this->assertEquals(
        0,
        $rosters[1]->totalStudents
    );
}

    public function test_get_processed_rosters_returns_empty_array_when_no_rosters_exist(): void
    {
        $rosters = $this->storage->getProcessedRosters();

        $this->assertIsArray($rosters);
        $this->assertEmpty($rosters);
    }

    public function test_update_academic_user_successfully(): void
{
    $user = Usuario::create([
        'nombre' => 'Carlos Morales',
        'email' => 'carlos.morales@umss.edu.bo',
        'ci' => '888888',
        'contrasena' => bcrypt('oldpassword123'),
        'activo' => true,
    ]);


    $updateData = new UserUpdateData(
        fullName: 'Carlos Morales Modificado',
        email: 'carlos.m@umss.edu.bo',
        role: 'DOCENTE',
        newPassword: null
    );


    $result = $this->storage->updateAcademicUser(
        $user->id,
        $updateData
    );


    $this->assertTrue(
        $result->isSuccessful
    );


    $this->assertEquals(
        'Usuario actualizado correctamente',
        $result->message
    );


    $this->assertDatabaseHas('usuario', [
        'id' => $user->id,
        'nombre' => 'Carlos Morales Modificado',
        'email' => 'carlos.m@umss.edu.bo',
        'activo' => true,
    ]);
}

    public function test_update_academic_user_with_new_password_successfully(): void
{
    $user = Usuario::create([
        'nombre' => 'Ana Torrico',
        'email' => 'ana.torrico@umss.edu.bo',
        'ci' => '999999',
        'contrasena' => bcrypt('oldpassword123'),
        'activo' => true,
    ]);


    $updateData = new UserUpdateData(
        fullName: 'Ana Patricia Torrico',
        email: 'ana.torrico@umss.edu.bo',
        role: 'DOCENTE',
        newPassword: 'NewSecurePassword123'
    );


    $result = $this->storage->updateAcademicUser(
        $user->id,
        $updateData
    );


    $this->assertTrue(
        $result->isSuccessful
    );


    $this->assertEquals(
        'Usuario actualizado correctamente',
        $result->message
    );


    $user->refresh();


    $this->assertEquals(
        'Ana Patricia Torrico',
        $user->nombre
    );


    $this->assertTrue(
        \Illuminate\Support\Facades\Hash::check(
            'NewSecurePassword123',
            $user->contrasena
        )
    );
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
    $user = Usuario::create([
        'nombre' => 'Docente Prueba',
        'email' => 'prueba@umss.edu.bo',
        'ci' => '123456',
        'contrasena' => bcrypt('password123'),
        'activo' => true,
    ]);


    $updateData = new UserUpdateData(
        fullName: 'Docente Prueba',
        email: 'prueba@gmail.com',
        role: 'DOCENTE'
    );


    $result = $this->storage->updateAcademicUser(
        $user->id,
        $updateData
    );


    $this->assertFalse(
        $result->isSuccessful
    );


    $this->assertStringContainsString(
        '@umss.edu.bo',
        $result->message
    );
}

    public function test_update_academic_user_rejects_email_used_by_another_user(): void
{
    Usuario::create([
        'nombre' => 'Usuario Uno',
        'email' => 'usuario.uno@umss.edu.bo',
        'ci' => '111111',
        'contrasena' => bcrypt('password123'),
        'activo' => true,
    ]);


    $userTwo = Usuario::create([
        'nombre' => 'Usuario Dos',
        'email' => 'usuario.dos@umss.edu.bo',
        'ci' => '222222',
        'contrasena' => bcrypt('password123'),
        'activo' => true,
    ]);



    $updateData = new UserUpdateData(
        fullName: 'Usuario Dos Modificado',
        email: 'usuario.uno@umss.edu.bo',
        role: 'DOCENTE'
    );



    $result = $this->storage->updateAcademicUser(
        $userTwo->id,
        $updateData
    );



    $this->assertFalse(
        $result->isSuccessful
    );


    $this->assertEquals(
        'El correo ya está registrado por otro usuario',
        $result->message
    );
}
    public function test_get_enrolled_students_returns_students_with_status_ordered_by_name(): void
{
    $teacher = Usuario::create([
        'nombre' => 'Docente Titular',
        'email' => 'docente@umss.edu.bo',
        'ci' => '111111',
        'contrasena' => bcrypt('password123'),
        'activo' => true,
    ]);


    $materia = Materia::create([
        'sigla' => 'INF110',
        'nombre' => 'Introduccion a la Programacion',
        'activo' => true,
    ]);


    $materiaGrupo = MateriaGrupo::create([
        'materia_id' => $materia->id,
        'grupo' => '1',
        'gestion' => '2/2026',
        'docente_id' => $teacher->id,
        'activo' => true,
    ]);



    $usuarioMario = Usuario::create([
        'nombre' => 'ZAMBRANA MARIO',
        'email' => 'mario@umss.edu.bo',
        'ci' => '7891234',
        'contrasena' => bcrypt('password123'),
        'activo' => true,
    ]);


    $usuarioPedro = Usuario::create([
        'nombre' => 'ALVAREZ PEDRO',
        'email' => 'pedro@umss.edu.bo',
        'ci' => '6543210',
        'contrasena' => bcrypt('password123'),
        'activo' => true,
    ]);



    Estudiante::create([
        'codigo_sis' => '202001234',
        'usuario_id' => $usuarioMario->id,
    ]);


    Estudiante::create([
        'codigo_sis' => '202005678',
        'usuario_id' => $usuarioPedro->id,
    ]);



    $estadoHabilitado = EstadoInscripcion::create([
        'nombre' => 'HABILITADO',
        'descripcion' => 'Estudiante habilitado para rendir examen',
    ]);


    $estadoInhabilitado = EstadoInscripcion::create([
        'nombre' => 'INHABILITADO',
        'descripcion' => 'Estudiante inhabilitado para rendir examen',
    ]);



    Inscripcion::create([
        'usuario_id' => $usuarioMario->id,
        'materia_grupo_id' => $materiaGrupo->id,
        'estado_inscripcion_id' => $estadoInhabilitado->id,
        'motivo_inhabilitacion' => 'No entrego Proyecto 2',
        'fecha_inscripcion' => now(),
    ]);


    Inscripcion::create([
        'usuario_id' => $usuarioPedro->id,
        'materia_grupo_id' => $materiaGrupo->id,
        'estado_inscripcion_id' => $estadoHabilitado->id,
        'motivo_inhabilitacion' => null,
        'fecha_inscripcion' => now(),
    ]);



    $results = $this->storage->getEnrolledStudents(
        $materiaGrupo->id
    );



    $this->assertCount(
        2,
        $results
    );


    $this->assertEquals(
        'ALVAREZ PEDRO',
        $results[0]->fullName
    );


    $this->assertEquals(
        'HABILITADO',
        $results[0]->status
    );


    $this->assertNull(
        $results[0]->ineligibilityReason
    );



    $this->assertEquals(
        'ZAMBRANA MARIO',
        $results[1]->fullName
    );


    $this->assertEquals(
        'INHABILITADO',
        $results[1]->status
    );


    $this->assertEquals(
        'No entrego Proyecto 2',
        $results[1]->ineligibilityReason
    );
}

   public function test_get_enrolled_students_returns_empty_when_no_students(): void
{
    $results = $this->storage->getEnrolledStudents(99999);


    $this->assertIsArray($results);

    $this->assertEmpty($results);
}

    /** @param array<int, array<int, string>> $rows */
    private function makeXlsxContent(array $rows): string
    {
        $spreadsheet = new Spreadsheet();
        $spreadsheet->getActiveSheet()->fromArray($rows, null, 'A1');
        $path = tempnam(sys_get_temp_dir(), 'roster-test-');

        try {
            (new Xlsx($spreadsheet))->save($path);
            $content = file_get_contents($path);
            $this->assertNotFalse($content);
            return $content;
        } finally {
            $spreadsheet->disconnectWorksheets();
            @unlink($path);
        }
    }
}

