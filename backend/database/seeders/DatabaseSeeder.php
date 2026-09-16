<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Cuenta de Administrador
        User::updateOrCreate(
            ['email' => 'admin@umss.edu.bo'],
            [
                'name' => 'Administrador del Sistema',
                'role' => 'ADMIN',
                'password' => Hash::make('password123'),
                'is_active' => true,
            ]
        );

        // 2. TEACHER
        User::updateOrCreate(
            ['email' => 'docente@umss.edu.bo'],
            [
                'name' => 'Perez Gomez Juan',
                'role' => 'TEACHER',
                'password' => Hash::make('password123'),
                'is_active' => true,
            ]
        );
    }
}
