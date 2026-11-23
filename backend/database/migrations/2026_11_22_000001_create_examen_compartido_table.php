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
        Schema::create('examen_compartido', function (Blueprint $table) {
            $table->id();
            $table->foreignId('examen_id')->constrained('examen')->cascadeOnDelete();
            $table->foreignId('docente_invitado_id')->constrained('usuario')->cascadeOnDelete();
            $table->foreignId('materia_grupo_id')->nullable()->constrained('materia_grupo')->nullOnDelete();
            $table->string('estado', 30)->default('PENDIENTE'); // PENDIENTE, ACEPTADO, RECHAZADO
            $table->string('mensaje', 255)->nullable();
            $table->timestamps();

            $table->unique(['examen_id', 'docente_invitado_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('examen_compartido');
    }
};
