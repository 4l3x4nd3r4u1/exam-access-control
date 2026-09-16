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
        Schema::table('examen_aula', function (Blueprint $table) {
            $table->foreign(['id_aula'], 'fk_examen_aula_aula')->references(['id_aula'])->on('aula')->onUpdate('cascade')->onDelete('restrict');
            $table->foreign(['id_examen'], 'fk_examen_aula_examen')->references(['id_examen'])->on('examen')->onUpdate('cascade')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('examen_aula', function (Blueprint $table) {
            $table->dropForeign('fk_examen_aula_aula');
            $table->dropForeign('fk_examen_aula_examen');
        });
    }
};
