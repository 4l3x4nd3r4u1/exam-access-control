<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('exam:clean-shared', function () {
    $invitations = DB::table('examen_invitacion')->get();
    $countInv = $invitations->count();
    $examIds = $invitations->pluck('examen_id')->unique()->filter()->values()->all();

    // Eliminar todas las invitaciones
    DB::table('examen_invitacion')->delete();
    $this->info("Se eliminaron {$countInv} invitaciones de examen compartido.");

    // Eliminar los exámenes que tenían invitación para dejar todo limpio
    if (!empty($examIds)) {
        $deletedExams = DB::table('examen')->whereIn('id', $examIds)->delete();
        $this->info("Se eliminaron {$deletedExams} exámenes vinculados a esas invitaciones (con sus aulas y estudiantes en cascada).");
    }

    $this->info("Base de datos limpia y lista para volver a probar el flujo de exámenes compartidos.");
})->purpose('Eliminar invitaciones y exámenes compartidos de prueba');

