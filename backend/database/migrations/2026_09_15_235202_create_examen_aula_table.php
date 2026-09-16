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
        Schema::create('examen_aula', function (Blueprint $table) {
            $table->bigInteger('id_examen');
            $table->bigInteger('id_aula')->index('idx_17289_idx_examen_aula_aula');

            $table->primary(['id_examen', 'id_aula']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('examen_aula');
    }
};
