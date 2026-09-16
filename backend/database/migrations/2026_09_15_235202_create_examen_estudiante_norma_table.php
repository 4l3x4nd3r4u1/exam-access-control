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
        Schema::create('examen_estudiante_norma', function (Blueprint $table) {
            $table->bigInteger('id_examen');
            $table->bigInteger('id_estudiante');
            $table->bigInteger('id_norma')->index('idx_17308_idx_een_norma');

            $table->primary(['id_examen', 'id_estudiante', 'id_norma']);
            $table->index(['id_examen', 'id_norma'], 'idx_17308_fk_een_examen_norma');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('examen_estudiante_norma');
    }
};
