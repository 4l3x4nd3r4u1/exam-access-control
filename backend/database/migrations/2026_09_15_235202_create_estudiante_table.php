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
        Schema::create('estudiante', function (Blueprint $table) {
            $table->bigIncrements('id_estudiante');
            $table->string('codigo_sis')->unique('idx_17250_uk_estudiante_codigo');
            $table->string('tipo_documento');
            $table->string('numero_documento')->index('idx_17250_idx_estudiante_documento');
            $table->string('nombres');
            $table->string('apellidos');
            $table->string('codigo_qr')->nullable()->unique('idx_17250_uk_estudiante_qr');
            $table->smallInteger('activo')->default(1);

            $table->unique(['tipo_documento', 'numero_documento'], 'idx_17250_uk_estudiante_documento');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('estudiante');
    }
};
