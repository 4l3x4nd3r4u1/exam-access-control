<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class SecuritySeeder extends Seeder
{
    /**
     * Seed roles, functions, role-function permissions, and initial users.
     */
    public function run(): void
    {
        // 1. Roles (rol)
        $roles = [
            ['nombre' => 'ADMIN', 'descripcion' => 'Administrador institucional del sistema'],
            ['nombre' => 'DOCENTE', 'descripcion' => 'Docente titular y encargado de asignatura'],
            ['nombre' => 'AUXILIAR', 'descripcion' => 'Auxiliar de control de acceso y supervisión en puerta'],
            ['nombre' => 'ESTUDIANTE', 'descripcion' => 'Perfil de estudiante universitario'],
        ];

        $roleIds = [];
        foreach ($roles as $r) {
            DB::table('rol')->updateOrInsert(
                ['nombre' => $r['nombre']],
                array_merge($r, ['activo' => true, 'created_at' => now(), 'updated_at' => now()])
            );
            $roleIds[$r['nombre']] = DB::table('rol')->where('nombre', $r['nombre'])->value('id');
        }

        // 2. The 11 System Functions (funcion)
        $funciones = [
            ['numero' => 'LISTAR_PERSONAL_ACADEMICO', 'nombre' => 'Listar personal académico registrado'],
            ['numero' => 'LISTAR_PLANILLAS_PROCESADAS', 'nombre' => 'Listar planillas procesadas y detalle'],
            ['numero' => 'IMPORTAR_PADRON', 'nombre' => 'Importar padrón oficial de estudiantes'],
            ['numero' => 'EDITAR_PERSONAL_ACADEMICO', 'nombre' => 'Editar personal académico (datos personales y rol)'],
            ['numero' => 'EDITAR_DATOS_PERSONALES', 'nombre' => 'Editar datos personales de cuenta propia'],
            ['numero' => 'REGISTRAR_PERSONAL_ACADEMICO', 'nombre' => 'Registrar nuevo personal académico'],
            ['numero' => 'VISUALIZAR_MATERIAS_ASIGNADAS', 'nombre' => 'Visualizar materias asignadas a cargo'],
            ['numero' => 'LISTAR_ESTUDIANTES_MATERIA', 'nombre' => 'Listar estudiantes inscritos dentro de una materia'],
            ['numero' => 'PROGRAMAR_EXAMEN', 'nombre' => 'Programar examen para una materia con asignación automática de aulas'],
            ['numero' => 'LISTAR_EXAMENES_MATERIA', 'nombre' => 'Listar exámenes programados de una materia'],
            ['numero' => 'GESTIONAR_HABILITACION_ESTUDIANTE', 'nombre' => 'Cambiar estado de habilitación de un estudiante con motivo académico'],
        ];

        $funcionIds = [];
        foreach ($funciones as $f) {
            DB::table('funcion')->updateOrInsert(
                ['numero' => $f['numero']],
                array_merge($f, ['activo' => true, 'created_at' => now(), 'updated_at' => now()])
            );
            $funcionIds[$f['numero']] = DB::table('funcion')->where('numero', $f['numero'])->value('id');
        }

        // 3. Role-Function Assignments (rol_funcion)
        $permisosPorRol = [
            'ADMIN' => [
                'LISTAR_PERSONAL_ACADEMICO',
                'LISTAR_PLANILLAS_PROCESADAS',
                'IMPORTAR_PADRON',
                'EDITAR_PERSONAL_ACADEMICO',
                'EDITAR_DATOS_PERSONALES',
                'REGISTRAR_PERSONAL_ACADEMICO',
            ],
            'DOCENTE' => [
                'EDITAR_DATOS_PERSONALES',
                'VISUALIZAR_MATERIAS_ASIGNADAS',
                'LISTAR_ESTUDIANTES_MATERIA',
                'PROGRAMAR_EXAMEN',
                'LISTAR_EXAMENES_MATERIA',
                'GESTIONAR_HABILITACION_ESTUDIANTE',
            ],
            'AUXILIAR' => [
                'EDITAR_DATOS_PERSONALES',
            ],
            'ESTUDIANTE' => [
                'EDITAR_DATOS_PERSONALES',
            ],
        ];

        foreach ($permisosPorRol as $rolNombre => $funcionesNombres) {
            $rolId = $roleIds[$rolNombre];
            foreach ($funcionesNombres as $fn) {
                $funcionId = $funcionIds[$fn];
                DB::table('rol_funcion')->updateOrInsert(
                    ['rol_id' => $rolId, 'funcion_id' => $funcionId],
                    ['activo' => true, 'fecha_asignacion' => now(), 'created_at' => now(), 'updated_at' => now()]
                );
            }
        }

        // 4. Initial Users and Role Assignments (usuario & usuario_rol)
        $umssDomainId = DB::table('email')->where('dominio', '@umss.edu.bo')->value('id');

        $usuariosIniciales = [
            [
                'email' => 'juan.perez@umss.edu.bo',
                'nombre' => 'Juan Carlos Perez Gomez',
                'ci' => '30000003',
                'roles' => ['DOCENTE'],
            ],
            // Superusuario with ALL roles (ADMIN, DOCENTE, AUXILIAR, ESTUDIANTE)
            [
                'email' => 'superadmin@umss.edu.bo',
                'nombre' => 'Super Usuario',
                'ci' => '99999999',
                'roles' => ['ADMIN', 'DOCENTE', 'AUXILIAR', 'ESTUDIANTE'],
            ],
        ];

        $defaultPassword = Hash::make('password123');

        foreach ($usuariosIniciales as $u) {
            DB::table('usuario')->updateOrInsert(
                ['email' => $u['email']],
                [
                    'nombre' => $u['nombre'],
                    'ci' => $u['ci'],
                    'contrasena' => $defaultPassword,
                    'activo' => true,
                    'email_id' => $umssDomainId,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );

            $userId = DB::table('usuario')->where('email', $u['email'])->value('id');

            foreach ($u['roles'] as $rolNombre) {
                $rolId = $roleIds[$rolNombre];
                DB::table('usuario_rol')->updateOrInsert(
                    ['usuario_id' => $userId, 'rol_id' => $rolId],
                    ['activo' => true, 'fecha_asignacion' => now(), 'created_at' => now(), 'updated_at' => now()]
                );
            }
        }
    }
}
