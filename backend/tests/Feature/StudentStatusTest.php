<?php

namespace Tests\Feature;

use App\Models\EstadoInscripcion;
use App\Models\Estudiante;
use App\Models\Inscripcion;
use App\Models\Materia;
use App\Models\MateriaGrupo;
use App\Models\Usuario;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StudentStatusTest extends TestCase
{
    use RefreshDatabase;


    public function test_can_update_student_status_via_api(): void
    {
        $teacher = Usuario::create([
            'nombre' => 'Docente Titular',
            'email' => 'docente.titular@fcyt.umss.edu.bo',
            'ci' => '123456',
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


        $usuarioEstudiante = Usuario::create([
            'nombre' => 'Perez Gomez Juan Carlos',
            'email' => '8765432@estudiante.umss.edu.bo',
            'ci' => '8765432',
            'contrasena' => bcrypt('password123'),
            'activo' => true,
        ]);


        Estudiante::create([
            'codigo_sis' => '202100482',
            'usuario_id' => $usuarioEstudiante->id,
        ]);


        $estadoHabilitado = EstadoInscripcion::create([
            'nombre' => 'HABILITADO',
            'descripcion' => 'Estudiante habilitado para rendir examen',
        ]);


        Inscripcion::create([
            'usuario_id' => $usuarioEstudiante->id,
            'materia_grupo_id' => $materiaGrupo->id,
            'estado_inscripcion_id' => $estadoHabilitado->id,
            'motivo_inhabilitacion' => null,
            'fecha_inscripcion' => now(),
        ]);


        $response = $this->putJson(
            "/api/courses/{$materiaGrupo->id}/students/202100482/status",
            [
                'status' => 'INHABILITADO',
                'reason' => 'No entrego Proyecto 1',
            ]
        );


        $response
            ->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Estado del estudiante actualizado correctamente.',
            ]);


        $estadoInhabilitado = EstadoInscripcion::where(
            'nombre',
            'INHABILITADO'
        )->first();


        $this->assertNotNull($estadoInhabilitado);


        $this->assertDatabaseHas('inscripcion', [
            'usuario_id' => $usuarioEstudiante->id,
            'materia_grupo_id' => $materiaGrupo->id,
            'estado_inscripcion_id' => $estadoInhabilitado->id,
            'motivo_inhabilitacion' => 'No entrego Proyecto 1',
        ]);
    }



    public function test_update_status_validates_inhabilitado_reason_via_api(): void
    {
        $response = $this->putJson(
             "/api/courses/INF110-G1-2%2F2026/students/202100482/status",
            [
                'status' => 'INHABILITADO',
                'reason' => '',
            ]
        );


        $response
            ->assertStatus(422)
            ->assertJsonValidationErrors([
                'reason'
            ]);
    }
}