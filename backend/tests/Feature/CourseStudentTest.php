<?php

namespace Tests\Feature;

use App\Models\Usuario;
use App\Models\Materia;
use App\Models\MateriaGrupo;
use App\Models\Estudiante;
use App\Models\Inscripcion;
use App\Models\EstadoInscripcion;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CourseStudentTest extends TestCase
{
    use RefreshDatabase;


    public function test_can_list_enrolled_students_of_a_course_via_api(): void
    {

        $teacher = Usuario::create([
            'nombre' => 'Docente Titular',
            'email' => 'docente@umss.edu.bo',
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
            'nombre' => 'ALVAREZ PEDRO',
            'email' => 'alvarez.pedro@umss.edu.bo',
            'ci' => '7891234',
            'contrasena' => bcrypt('password123'),
            'activo' => true,
        ]);



        $estudiante = Estudiante::create([
            'codigo_sis' => '202001234',
            'usuario_id' => $usuarioEstudiante->id,
        ]);



        $estado = EstadoInscripcion::create([
            'nombre' => 'HABILITADO',
            'descripcion' => 'Estudiante habilitado para rendir examen',
        ]);



        Inscripcion::create([
            'usuario_id' => $usuarioEstudiante->id,
            'materia_grupo_id' => $materiaGrupo->id,
            'estado_inscripcion_id' => $estado->id,
            'motivo_inhabilitacion' => null,
            'fecha_inscripcion' => now(),
        ]);



        $response = $this->getJson(
            "/api/courses/{$materiaGrupo->id}/students"
        );



        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Estudiantes del curso obtenidos exitosamente.',
            ]);



        $response->assertJsonFragment([
            'ci' => '7891234',
            'fullName' => 'ALVAREZ PEDRO',
            'status' => 'HABILITADO',
            'ineligibilityReason' => null,
        ]);
    }
}