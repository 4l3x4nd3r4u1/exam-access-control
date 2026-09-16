<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('examen_estudiante', function (Blueprint $table) {
            $table->foreign(['id_estudiante'], 'fk_examen_estudiante_estudiante')->references(['id_estudiante'])->on('estudiante')->onUpdate('cascade')->onDelete('restrict');
            $table->foreign(['id_examen'], 'fk_examen_estudiante_examen')->references(['id_examen'])->on('examen')->onUpdate('cascade')->onDelete('cascade');
            $table->foreign(['id_examen', 'id_aula'], 'fk_examen_estudiante_examen_aula')->references(['id_examen', 'id_aula'])->on('examen_aula')->onUpdate('cascade')->onDelete('restrict');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('examen_estudiante', function (Blueprint $table) {
            $table->dropForeign('fk_examen_estudiante_estudiante');
            $table->dropForeign('fk_examen_estudiante_examen');
            $table->dropForeign('fk_examen_estudiante_examen_aula');
        });
    }
};
