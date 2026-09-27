<?php

namespace Tests\Unit;

use App\Models\EstadoInscripcion;
use App\Models\Estudiante;
use App\Models\Inscripcion;
use App\Models\Materia;
use App\Models\MateriaGrupo;
use App\Models\Usuario;
use App\Modules\EligibilityEngine;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EligibilityEngineTest extends TestCase
{
    use RefreshDatabase;

    private EligibilityEngine $engine;


    protected function setUp(): void
    {
        parent::setUp();

        $this->engine = new EligibilityEngine();
    }


    private function createTeacher(): Usuario
    {
        return Usuario::create([
            'nombre' => 'Docente Prueba',
            'email' => 'docente.test@umss.edu.bo',
            'ci' => '123456',
            'contrasena' => bcrypt('password123'),
            'activo' => true,
        ]);
    }


    private function createMateriaGrupo(Usuario $teacher): MateriaGrupo
    {
        $materia = Materia::create([
            'sigla' => 'INF110',
            'nombre' => 'Introduccion a la Programacion',
            'activo' => true,
        ]);


        return MateriaGrupo::create([
            'materia_id' => $materia->id,
            'grupo' => '1',
            'gestion' => '2/2026',
            'docente_id' => $teacher->id,
            'activo' => true,
        ]);
    }


    private function createStudent(): Estudiante
    {
        $usuario = Usuario::create([
            'nombre' => 'Perez Gomez Juan Carlos',
            'email' => '8765432@estudiante.umss.edu.bo',
            'ci' => '8765432',
            'contrasena' => bcrypt('password123'),
            'activo' => true,
        ]);


        return Estudiante::create([
            'codigo_sis' => 202100482,
            'usuario_id' => $usuario->id,
        ]);
    }


    private function createEstado(string $nombre): EstadoInscripcion
    {
        return EstadoInscripcion::create([
            'nombre' => $nombre,
            'descripcion' => $nombre,
        ]);
    }

    public function test_can_update_student_status_to_inhabilitado_with_reason(): void
    {
        $teacher = $this->createTeacher();
        $grupo = $this->createMateriaGrupo($teacher);
        $student = $this->createStudent();

        $estadoHabilitado = $this->createEstado('HABILITADO');


        Inscripcion::create([
            'usuario_id' => $student->usuario_id,
            'materia_grupo_id' => $grupo->id,
            'estado_inscripcion_id' => $estadoHabilitado->id,
            'motivo_inhabilitacion' => null,
            'fecha_inscripcion' => now(),
        ]);


        $result = $this->engine->updateStudentStatus(
            key: '202100482',
            courseGroupId: $grupo->id,
            status: 'INHABILITADO',
            reason: 'No entrego Proyecto 2'
        );


        $this->assertTrue($result->isSuccessful);


        $this->assertDatabaseHas('inscripcion', [
            'usuario_id' => $student->usuario_id,
            'materia_grupo_id' => $grupo->id,
            'motivo_inhabilitacion' => 'No entrego Proyecto 2',
        ]);
    }



    public function test_can_update_student_status_using_ci(): void
    {
        $teacher = $this->createTeacher();
        $grupo = $this->createMateriaGrupo($teacher);
        $student = $this->createStudent();

        $estadoInhabilitado = $this->createEstado('INHABILITADO');


        Inscripcion::create([
            'usuario_id' => $student->usuario_id,
            'materia_grupo_id' => $grupo->id,
            'estado_inscripcion_id' => $estadoInhabilitado->id,
            'motivo_inhabilitacion' => 'Falta justificada',
            'fecha_inscripcion' => now(),
        ]);


        $result = $this->engine->updateStudentStatus(
            key: '8765432',
            courseGroupId: $grupo->id,
            status: 'HABILITADO',
            reason: null
        );


        $this->assertTrue($result->isSuccessful);
    }



    public function test_rejects_inhabilitado_without_reason(): void
    {
        $result = $this->engine->updateStudentStatus(
            key: '202100482',
            courseGroupId: 1,
            status: 'INHABILITADO',
            reason: '   '
        );


        $this->assertFalse($result->isSuccessful);
    }



    public function test_rejects_invalid_status(): void
    {
        $result = $this->engine->updateStudentStatus(
            key: '202100482',
            courseGroupId: 1,
            status: 'OTRO_ESTADO'
        );


        $this->assertFalse($result->isSuccessful);
    }



    public function test_returns_error_when_student_not_found(): void
    {
        $result = $this->engine->updateStudentStatus(
            key: '999999999',
            courseGroupId: 1,
            status: 'HABILITADO'
        );


        $this->assertFalse($result->isSuccessful);
        $this->assertEquals(
            'Estudiante no encontrado.',
            $result->message
        );
    }



    public function test_returns_error_when_student_not_enrolled_in_course(): void
    {
        $this->createStudent();


        $result = $this->engine->updateStudentStatus(
            key: '202100482',
            courseGroupId: 999,
            status: 'HABILITADO'
        );


        $this->assertFalse($result->isSuccessful);
    }
}