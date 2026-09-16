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
        Schema::create('examen_norma', function (Blueprint $table) {
            $table->bigInteger('id_examen');
            $table->bigInteger('id_norma')->index('idx_17314_idx_examen_norma_norma');
            $table->smallInteger('obligatoria');

            $table->primary(['id_examen', 'id_norma']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('examen_norma');
    }
};
