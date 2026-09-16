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
        Schema::table('examen_estudiante_norma', function (Blueprint $table) {
            $table->foreign(['id_examen', 'id_estudiante'], 'fk_een_examen_estudiante')->references(['id_examen', 'id_estudiante'])->on('examen_estudiante')->onUpdate('cascade')->onDelete('cascade');
            $table->foreign(['id_examen', 'id_norma'], 'fk_een_examen_norma')->references(['id_examen', 'id_norma'])->on('examen_norma')->onUpdate('cascade')->onDelete('cascade');
            $table->foreign(['id_norma'], 'fk_een_norma')->references(['id_norma'])->on('norma')->onUpdate('cascade')->onDelete('restrict');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('examen_estudiante_norma', function (Blueprint $table) {
            $table->dropForeign('fk_een_examen_estudiante');
            $table->dropForeign('fk_een_examen_norma');
            $table->dropForeign('fk_een_norma');
        });
    }
};
