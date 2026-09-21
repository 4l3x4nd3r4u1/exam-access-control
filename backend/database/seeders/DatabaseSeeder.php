<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\CourseGroup;
use App\Models\Student;
use App\Models\StudentCourseEnrollment;
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
        $teacher = User::updateOrCreate(
            ['email' => 'docente@umss.edu.bo'],
            [
                'name' => 'Perez Gomez Juan',
                'role' => 'TEACHER',
                'password' => Hash::make('password123'),
                'is_active' => true,
            ]
        );

        // 3. Materia inicial asignada al docente
        $courseGroup = CourseGroup::updateOrCreate(
            ['course_group_id' => 'INF110-G1-2/2026'],
            [
                'subject_code' => 'INF110',
                'subject_name' => 'Introducción a la Programación',
                'group_code' => '1',
                'academic_term' => '2/2026',
                'teacher_id' => $teacher->id,
            ]
        );

        // 4. Estudiantes inscritos iniciales
        $students = [
            ['student_key' => '202100482', 'ci' => '8765432', 'full_name' => 'Perez Gomez Juan Carlos', 'status' => 'HABILITADO', 'reason' => null],
            ['student_key' => '202201934', 'ci' => '7654321', 'full_name' => 'Rodriguez Lopez Maria Elena', 'status' => 'HABILITADO', 'reason' => null],
            ['student_key' => '202305812', 'ci' => '6543210', 'full_name' => 'Fernandez Quispe Carlos Alberto', 'status' => 'HABILITADO', 'reason' => null],
            ['student_key' => '202008431', 'ci' => '5482910', 'full_name' => 'Torrico Morales Ana Patricia', 'status' => 'INHABILITADO', 'reason' => 'Falta de asistencia requerida'],
            ['student_key' => '202209115', 'ci' => '4321098', 'full_name' => 'Vargas Mamani Diego Alejandro', 'status' => 'HABILITADO', 'reason' => null],
        ];

        foreach ($students as $data) {
            Student::updateOrCreate(
                ['student_key' => $data['student_key']],
                [
                    'ci' => $data['ci'],
                    'full_name' => $data['full_name'],
                ]
            );

            StudentCourseEnrollment::updateOrCreate(
                [
                    'student_key' => $data['student_key'],
                    'course_group_id' => $courseGroup->course_group_id,
                ],
                [
                    'status' => $data['status'],
                    'ineligibility_reason' => $data['reason'],
                ]
            );
        }
    }
}
