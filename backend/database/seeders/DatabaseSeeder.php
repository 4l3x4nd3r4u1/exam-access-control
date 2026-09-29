<?php

namespace Database\Seeders;

use App\Models\Usuario;
use App\Models\Rol;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
      //tablas maestras
      Rol::updateOrCreate(
      ['nombre' => 'ADMIN'],
      ['descripcion' => 'Encargado del sistema'],
      ['activo' => true]
      );
      
      Rol::updateOrCreate(
      ['nombre' => 'TEACHER'],
      ['descripcion' => 'Docente de la universidad'],
      ['activo' => true]
      );
      
        // 1. Cuenta de Administrador
        Usuario::updateOrCreate(
            ['email' => 'admin@umss.edu.bo'],
            [
                'nombre' => 'Alexa',
                'contrasena' => Hash::make('password123'),
                'ci' => '11111111',
                'activo' => true,
            ]
        );
                
        // 2. TEACHER
        Usuario::updateOrCreate(
            ['email' => 'docente@umss.edu.bo'],
            [
                'nombre' => 'Perez Gomez Juan',
                'contrasena' => Hash::make('password123'),
                'ci' => '99999999',
                'activo' => true,
            ]
        );
        
         // Obtener los roles
        $adminRole = Rol::where('nombre', 'ADMIN')->first();
        $teacherRole = Rol::where('nombre', 'TEACHER')->first();

        // Asignar rol al Administrador
        $adminUser = Usuario::where('email', 'admin@umss.edu.bo')->first();
        if ($adminUser && $adminRole) {
            $adminUser->roles()->attach($adminRole->id,[
            'activo' => true,
            'fecha_asignacion' => now(),
            ]);
        }

        // Asignar rol al docente
        $teacherUser = Usuario::where('email', 'docente@umss.edu.bo')->first();
        if ($teacherUser && $teacherRole) {
            $teacherUser->roles()->attach($teacherRole->id,[
            'activo' => true,
            'fecha_asignacion' => now(),
            ]);
        }
    }
}
