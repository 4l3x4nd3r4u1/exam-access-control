<?php

namespace Tests\Feature;

use App\Models\Usuario;
use App\Models\Materia;
use App\Models\MateriaGrupo;
use App\Models\Estudiante;
use App\Models\EstadoInscripcion;
use App\Models\Inscripcion;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TeacherCourseTest extends TestCase
{
    use RefreshDatabase;


    public function test_can_get_assigned_courses_for_teacher(): void
    {

        $teacher = Usuario::create([
            'nombre' => 'Dr. Walter Sanchez',
            'email' => 'wsanchez@umss.edu.bo',
            'ci' => '111111',
            'contrasena' => bcrypt('password'),
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
            'nombre' => 'Estudiante Uno',
            'email' => '222222@estudiante.umss.edu.bo',
            'ci' => '222222',
            'contrasena' => bcrypt('password'),
            'activo' => true,
        ]);


        Estudiante::create([
            'codigo_sis' => '20210001',
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
            "/api/teachers/{$teacher->id}/courses"
        );


        $response
            ->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Materias del docente obtenidas exitosamente.',
            ])
            ->assertJsonCount(1, 'data');


        $this->assertEquals(
            $materiaGrupo->id,
            $response->json('data.0.course_group_id')
        );


        $this->assertEquals(
           'INF110',
           $response->json('data.0.subject_code')
        );


        $this->assertEquals(
           'Introduccion a la Programacion',
           $response->json('data.0.subject_name')
        );


        $this->assertEquals(
           '1',
           $response->json('data.0.group_code')
        );


        $this->assertEquals(
           '2/2026',
           $response->json('data.0.academic_term')
        );


        $this->assertEquals(
            1,
            $response->json('data.0.total_enrolled')
        );


        $this->assertEquals(
           $teacher->id,
           $response->json('data.0.teacher_id')
        );
    }
}