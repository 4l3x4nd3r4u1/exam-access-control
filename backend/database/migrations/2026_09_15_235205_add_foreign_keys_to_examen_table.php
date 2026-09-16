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
        Schema::table('examen', function (Blueprint $table) {
            $table->foreign(['id_materia'], 'fk_examen_materia')->references(['id_materia'])->on('materia')->onUpdate('cascade')->onDelete('restrict');
            $table->foreign(['id_usuario'], 'fk_examen_usuario1')->references(['id_usuario'])->on('usuario')->onUpdate('no action')->onDelete('no action');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('examen', function (Blueprint $table) {
            $table->dropForeign('fk_examen_materia');
            $table->dropForeign('fk_examen_usuario1');
        });
    }
};
