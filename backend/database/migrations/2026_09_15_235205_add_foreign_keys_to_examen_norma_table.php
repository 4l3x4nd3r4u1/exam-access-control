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
        Schema::table('examen_norma', function (Blueprint $table) {
            $table->foreign(['id_examen'], 'fk_examen_norma_examen')->references(['id_examen'])->on('examen')->onUpdate('cascade')->onDelete('cascade');
            $table->foreign(['id_norma'], 'fk_examen_norma_norma')->references(['id_norma'])->on('norma')->onUpdate('cascade')->onDelete('restrict');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('examen_norma', function (Blueprint $table) {
            $table->dropForeign('fk_examen_norma_examen');
            $table->dropForeign('fk_examen_norma_norma');
        });
    }
};
