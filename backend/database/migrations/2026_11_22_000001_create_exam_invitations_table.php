<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('examen_invitacion', function (Blueprint $table) {
            $table->id();
            $table->foreignId('examen_id')->constrained('examen')->cascadeOnDelete();
            $table->foreignId('docente_invitado_id')->constrained('usuario')->cascadeOnDelete();
            $table->foreignId('docente_invitador_id')->constrained('usuario')->cascadeOnDelete();
            $table->text('mensaje');
            $table->string('correo_estado', 20)->default('PENDIENTE');
            $table->timestamp('correo_enviado_en')->nullable();
            $table->timestamps();

            $table->unique(['examen_id', 'docente_invitado_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('examen_invitacion');
    }
};
