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
        Schema::table('incidente', function (Blueprint $table) {
            $table->foreign(['id_aula_anterior'], 'fk_incidente_aula_anterior')->references(['id_aula'])->on('aula')->onUpdate('cascade')->onDelete('restrict');
            $table->foreign(['id_aula_nueva'], 'fk_incidente_aula_nueva')->references(['id_aula'])->on('aula')->onUpdate('cascade')->onDelete('restrict');
            $table->foreign(['id_estudiante'], 'fk_incidente_estudiante')->references(['id_estudiante'])->on('estudiante')->onUpdate('cascade')->onDelete('set null');
            $table->foreign(['id_examen'], 'fk_incidente_examen')->references(['id_examen'])->on('examen')->onUpdate('cascade')->onDelete('restrict');
            $table->foreign(['id_usuario'], 'fk_incidente_usuario')->references(['id_usuario'])->on('usuario')->onUpdate('cascade')->onDelete('restrict');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('incidente', function (Blueprint $table) {
            $table->dropForeign('fk_incidente_aula_anterior');
            $table->dropForeign('fk_incidente_aula_nueva');
            $table->dropForeign('fk_incidente_estudiante');
            $table->dropForeign('fk_incidente_examen');
            $table->dropForeign('fk_incidente_usuario');
        });
    }
};
