<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CatalogSeeder extends Seeder
{
    /**
     * Seed catalog tables (email domains, statuses, exam types, rooms, master courses).
     */
    public function run(): void
    {
        // 1. Registered Email Domains (email)
        $dominios = [
            ['dominio' => '@umss.edu.bo', 'descripcion' => 'Personal docente y administrativo UMSS', 'activo' => true],
            ['dominio' => '@fcyt.umss.edu.bo', 'descripcion' => 'Facultad de Ciencias y Tecnología', 'activo' => true],
            ['dominio' => '@est.umss.edu', 'descripcion' => 'Estudiantes regulares UMSS', 'activo' => true],
        ];
        foreach ($dominios as $d) {
            DB::table('email')->updateOrInsert(
                ['dominio' => $d['dominio']],
                array_merge($d, ['created_at' => now(), 'updated_at' => now()])
            );
        }

        // 2. Enrollment Statuses (estado_inscripcion)
        $estadosInscripcion = [
            ['nombre' => 'HABILITADO', 'descripcion' => 'Estudiante habilitado académicamente para evaluaciones'],
            ['nombre' => 'INHABILITADO', 'descripcion' => 'Estudiante inhabilitado por incumplimiento de requisitos académicos'],
        ];
        foreach ($estadosInscripcion as $ei) {
            DB::table('estado_inscripcion')->updateOrInsert(
                ['nombre' => $ei['nombre']],
                array_merge($ei, ['created_at' => now(), 'updated_at' => now()])
            );
        }

        // 3. Exam Types (tipo_examen) - Full names without abbreviations
        $tiposExamen = [
            ['nombre' => 'PRIMER PARCIAL'],
            ['nombre' => 'SEGUNDO PARCIAL'],
            ['nombre' => 'EXAMEN FINAL'],
            ['nombre' => 'SEGUNDA INSTANCIA'],
            ['nombre' => 'EXAMEN DE MESA'],
        ];
        foreach ($tiposExamen as $te) {
            DB::table('tipo_examen')->updateOrInsert(
                ['nombre' => $te['nombre']],
                array_merge($te, ['created_at' => now(), 'updated_at' => now()])
            );
        }

        // 4. Student Exam Attendance Statuses (estado_examen_estudiante) - Natural names
        $estadosExamen = [
            ['nombre' => 'AUSENTE', 'descripcion' => 'Estudiante no se presentó al aula'],
            ['nombre' => 'PRESENTE', 'descripcion' => 'Estudiante ingresó al aula con validación en puerta'],
            ['nombre' => 'EXPULSADO', 'descripcion' => 'Estudiante expulsado o examen anulado por falta'],
            ['nombre' => 'INGRESO EXCEPCIONAL', 'descripcion' => 'Estudiante autorizado extraordinariamente por el docente'],
        ];
        foreach ($estadosExamen as $ee) {
            DB::table('estado_examen_estudiante')->updateOrInsert(
                ['nombre' => $ee['nombre']],
                array_merge($ee, ['created_at' => now(), 'updated_at' => now()])
            );
        }

        // 5. Classrooms (aula)
        $aulas = [
            ['nombre' => 'Aula 691A', 'capacidad' => 50],
            ['nombre' => 'Aula 691B', 'capacidad' => 80],
            ['nombre' => 'Auditorio', 'capacidad' => 200],
        ];
        foreach ($aulas as $a) {
            DB::table('aula')->updateOrInsert(
                ['nombre' => $a['nombre']],
                array_merge($a, ['created_at' => now(), 'updated_at' => now()])
            );
        }

        // 6. Master Subjects (materia) - Independent Strong Catalog
        $materias = [
            ['sigla' => 'INF110', 'nombre' => 'Introduccion a la Programacion', 'activo' => true],
            ['sigla' => 'INF210', 'nombre' => 'Estructura de Datos', 'activo' => true],
            ['sigla' => 'FIS100', 'nombre' => 'Fisica General', 'activo' => true],
        ];
        foreach ($materias as $m) {
            DB::table('materia')->updateOrInsert(
                ['sigla' => $m['sigla']],
                array_merge($m, ['created_at' => now(), 'updated_at' => now()])
            );
        }
    }
}
