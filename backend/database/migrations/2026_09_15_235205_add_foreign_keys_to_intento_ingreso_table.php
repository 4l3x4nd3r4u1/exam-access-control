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
        Schema::table('intento_ingreso', function (Blueprint $table) {
            $table->foreign(['id_aula'], 'fk_intento_aula')->references(['id_aula'])->on('aula')->onUpdate('cascade')->onDelete('restrict');
            $table->foreign(['id_estudiante'], 'fk_intento_estudiante')->references(['id_estudiante'])->on('estudiante')->onUpdate('cascade')->onDelete('set null');
            $table->foreign(['id_examen'], 'fk_intento_examen')->references(['id_examen'])->on('examen')->onUpdate('cascade')->onDelete('restrict');
            $table->foreign(['id_usuario'], 'fk_intento_usuario')->references(['id_usuario'])->on('usuario')->onUpdate('cascade')->onDelete('restrict');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('intento_ingreso', function (Blueprint $table) {
            $table->dropForeign('fk_intento_aula');
            $table->dropForeign('fk_intento_estudiante');
            $table->dropForeign('fk_intento_examen');
            $table->dropForeign('fk_intento_usuario');
        });
    }
};
