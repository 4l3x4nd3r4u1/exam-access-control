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

class ProcessedRosterTest extends TestCase
{
    use RefreshDatabase;


    public function test_can_list_processed_rosters_with_student_count(): void
    {

        $teacher = Usuario::create([
            'nombre' => 'Walter Sanchez',
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



        $estado = EstadoInscripcion::create([
            'nombre' => 'HABILITADO',
            'descripcion' => 'Estudiante habilitado para rendir examen',
        ]);



        $usuario1 = Usuario::create([
            'nombre' => 'Student One',
            'email' => 'student1@umss.edu.bo',
            'ci' => '1111111',
            'contrasena' => bcrypt('password'),
            'activo' => true,
        ]);


        $usuario2 = Usuario::create([
            'nombre' => 'Student Two',
            'email' => 'student2@umss.edu.bo',
            'ci' => '2222222',
            'contrasena' => bcrypt('password'),
            'activo' => true,
        ]);



        Estudiante::create([
            'codigo_sis' => '20210001',
            'usuario_id' => $usuario1->id,
        ]);


        Estudiante::create([
            'codigo_sis' => '20210002',
            'usuario_id' => $usuario2->id,
        ]);



        Inscripcion::create([
            'usuario_id' => $usuario1->id,
            'materia_grupo_id' => $materiaGrupo->id,
            'estado_inscripcion_id' => $estado->id,
            'fecha_inscripcion' => now(),
        ]);


        Inscripcion::create([
            'usuario_id' => $usuario2->id,
            'materia_grupo_id' => $materiaGrupo->id,
            'estado_inscripcion_id' => $estado->id,
            'fecha_inscripcion' => now(),
        ]);



        $response = $this->getJson('/api/processed-rosters');



        $response
            ->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Planillas procesadas obtenidas exitosamente.',
            ])
            ->assertJsonFragment([
                'subjectCode' => 'INF110',
                'subjectName' => 'Introduccion a la Programacion',
                'groupCode' => '1',
                'academicTerm' => '2/2026',
                'totalStudents' => 2,
                'teacherName' => 'Walter Sanchez',
            ]);
    }



    public function test_returns_empty_list_when_no_processed_rosters_exist(): void
    {

        $response = $this->getJson('/api/processed-rosters');


        $response
            ->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [],
                'message' => 'Planillas procesadas obtenidas exitosamente.',
            ]);
    }
}