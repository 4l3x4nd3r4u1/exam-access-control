<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('examen_invitacion')) {
            Schema::table('examen_invitacion', function (Blueprint $table) {
                if (!Schema::hasColumn('examen_invitacion', 'materia_grupo_id')) {
                    $table->foreignId('materia_grupo_id')->nullable()->constrained('materia_grupo')->nullOnDelete();
                }
                if (!Schema::hasColumn('examen_invitacion', 'materia_grupo_ids')) {
                    $table->string('materia_grupo_ids', 255)->nullable();
                }
                if (!Schema::hasColumn('examen_invitacion', 'estado')) {
                    $table->string('estado', 20)->default('PENDIENTE');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('examen_invitacion')) {
            Schema::table('examen_invitacion', function (Blueprint $table) {
                if (Schema::hasColumn('examen_invitacion', 'materia_grupo_id')) {
                    $table->dropForeign(['materia_grupo_id']);
                    $table->dropColumn('materia_grupo_id');
                }
                if (Schema::hasColumn('examen_invitacion', 'materia_grupo_ids')) {
                    $table->dropColumn('materia_grupo_ids');
                }
                if (Schema::hasColumn('examen_invitacion', 'estado')) {
                    $table->dropColumn('estado');
                }
            });
        }
    }
};
