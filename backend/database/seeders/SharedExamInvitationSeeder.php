<?php

namespace Database\Seeders;

use App\Models\Course;
use App\Models\CourseGroup;
use App\Models\EmailDomain;
use App\Models\EnrollmentStatus;
use App\Models\Exam;
use App\Models\ExamRoom;
use App\Models\ExamStudent;
use App\Models\ExamStudentStatus;
use App\Models\ExamType;
use App\Models\Inscripcion;
use App\Models\Room;
use App\Models\SharedExamInvitation;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class SharedExamInvitationSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Get Teachers Ana Morales and Juan Perez
        $ana = User::where('email', 'ana.morales@umss.edu.bo')->first();
        $juan = User::where('email', 'juan.perez@umss.edu.bo')->first();

        if (!$ana || !$juan) {
            return;
        }

        // 2. Course: Introduccion a la Programacion
        $course = Course::firstOrCreate(
            ['sigla' => 'INF110'],
            ['nombre' => 'Introduccion a la Programacion', 'activo' => true]
        );

        $academicTerm = '2/2026';

        // 3. Ana's Group 1
        $anaGroup = CourseGroup::firstOrCreate(
            [
                'materia_id' => $course->id,
                'grupo' => '1',
                'gestion' => $academicTerm,
            ],
            [
                'docente_id' => $ana->id,
                'activo' => true,
            ]
        );
        if ($anaGroup->docente_id !== $ana->id) {
            $anaGroup->docente_id = $ana->id;
            $anaGroup->save();
        }

        // 4. Juan's Group 2
        $juanGroup = CourseGroup::firstOrCreate(
            [
                'materia_id' => $course->id,
                'grupo' => '2',
                'gestion' => $academicTerm,
            ],
            [
                'docente_id' => $juan->id,
                'activo' => true,
            ]
        );
        if ($juanGroup->docente_id !== $juan->id) {
            $juanGroup->docente_id = $juan->id;
            $juanGroup->save();
        }

        // 5. Ensure Rooms
        $aulaA = Room::firstOrCreate(
            ['nombre' => 'Aula 691A'],
            ['capacidad' => 50]
        );
        $aulaB = Room::firstOrCreate(
            ['nombre' => 'Aula 691B'],
            ['capacidad' => 80]
        );

        // 6. Ensure some students enrolled in Juan's group
        $umssDomainId = EmailDomain::where('dominio', '@est.umss.edu')->value('id')
            ?? EmailDomain::first()->id;
        $habilitadoStatus = EnrollmentStatus::where('nombre', 'HABILITADO')->first();
        $ausenteStatus = ExamStudentStatus::where('nombre', 'AUSENTE')->first();

        // Enrolled students for Juan (Group 2)
        $currentJuanEnrollments = Inscripcion::where('materia_grupo_id', $juanGroup->id)->count();
        if ($currentJuanEnrollments < 35) {
            for ($i = $currentJuanEnrollments + 1; $i <= 35; $i++) {
                $ci = '450000' . str_pad((string) $i, 3, '0', STR_PAD_LEFT);
                $email = 'estudiante.g2.' . $i . '@est.umss.edu';
                $student = User::firstOrCreate(
                    ['email' => $email],
                    [
                        'nombre' => "Estudiante G2 Número {$i}",
                        'ci' => $ci,
                        'contrasena' => Hash::make('password123'),
                        'activo' => true,
                        'email_id' => $umssDomainId,
                    ]
                );

                Inscripcion::firstOrCreate(
                    [
                        'usuario_id' => $student->id,
                        'materia_grupo_id' => $juanGroup->id,
                    ],
                    [
                        'estado_inscripcion_id' => $habilitadoStatus?->id ?? 1,
                        'fecha_inscripcion' => now(),
                    ]
                );
            }
        }

        // Enrolled students for Ana (Group 1)
        $currentAnaEnrollments = Inscripcion::where('materia_grupo_id', $anaGroup->id)->count();
        if ($currentAnaEnrollments < 45) {
            for ($i = $currentAnaEnrollments + 1; $i <= 45; $i++) {
                $ci = '440000' . str_pad((string) $i, 3, '0', STR_PAD_LEFT);
                $email = 'estudiante.g1.' . $i . '@est.umss.edu';
                $student = User::firstOrCreate(
                    ['email' => $email],
                    [
                        'nombre' => "Estudiante G1 Número {$i}",
                        'ci' => $ci,
                        'contrasena' => Hash::make('password123'),
                        'activo' => true,
                        'email_id' => $umssDomainId,
                    ]
                );

                Inscripcion::firstOrCreate(
                    [
                        'usuario_id' => $student->id,
                        'materia_grupo_id' => $anaGroup->id,
                    ],
                    [
                        'estado_inscripcion_id' => $habilitadoStatus?->id ?? 1,
                        'fecha_inscripcion' => now(),
                    ]
                );
            }
        }

        // 7. Exam Type: Primer Parcial
        $examType = ExamType::where('nombre', 'PRIMER PARCIAL')->first() ?? ExamType::first();

        // 8. Ana's scheduled Exam
        $examDate = Carbon::now('America/La_Paz')->addDays(5)->format('Y-m-d');
        $exam = Exam::firstOrCreate(
            [
                'materia_grupo_id' => $anaGroup->id,
                'tipo_examen_id' => $examType->id,
                'fecha' => $examDate,
            ],
            [
                'hora_inicio' => '08:15',
                'hora_fin' => '09:45',
                'activo' => true,
            ]
        );

        // Assign Aula 691A with 45 seats for Ana's students
        ExamRoom::updateOrCreate(
            ['examen_id' => $exam->id, 'aula_id' => $aulaA->id],
            [
                'cupo_asignado' => 45,
                'auxiliar_id' => $ana->id,
            ]
        );

        // Assign Ana's students to this room
        $anaStudents = Inscripcion::where('materia_grupo_id', $anaGroup->id)->pluck('usuario_id');
        foreach ($anaStudents as $stId) {
            ExamStudent::updateOrCreate(
                ['examen_id' => $exam->id, 'usuario_id' => $stId],
                [
                    'aula_id' => $aulaA->id,
                    'estado_id' => $ausenteStatus?->id ?? 1,
                ]
            );
        }

        // 9. Shared Exam already Accepted between Ana and Juan
        SharedExamInvitation::updateOrCreate(
            [
                'examen_id' => $exam->id,
                'docente_invitado_id' => $juan->id,
            ],
            [
                'materia_grupo_id' => $juanGroup->id,
                'estado' => 'ACEPTADO',
                'mensaje' => 'Examen conjunto coordinado entre Grupo 1 (Ana Morales) y Grupo 2 (Juan Pérez).',
            ]
        );
    }
}
