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
        // 1. Table: estudiante (Student profile / SIS specialization of usuario)
        Schema::create('estudiante', function (Blueprint $table) {
            $table->unsignedBigInteger('codigo_sis')->primary();
            $table->foreignId('usuario_id')->unique()->constrained('usuario')->cascadeOnDelete();
            $table->timestamps();
        });

        // 2. Table: materia (Master / Course Catalog)
        Schema::create('materia', function (Blueprint $table) {
            $table->id();
            $table->string('sigla', 30)->unique();
            $table->string('nombre', 150);
            $table->boolean('activo')->default(true);
            $table->timestamps();
        });

        // 3. Table: materia_grupo (Detail / Specific Course Offering per Term)
        Schema::create('materia_grupo', function (Blueprint $table) {
            $table->id();
            $table->foreignId('materia_id')->constrained('materia')->cascadeOnDelete();
            $table->string('grupo', 20);
            $table->string('gestion', 30);
            $table->foreignId('docente_id')->constrained('usuario')->cascadeOnDelete();
            $table->boolean('activo')->default(true);
            $table->timestamps();

            $table->unique(['materia_id', 'grupo', 'gestion']);
        });

        // 4. Table: estado_inscripcion (Enrollment status catalog: HABILITADO, INHABILITADO)
        Schema::create('estado_inscripcion', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 50)->unique();
            $table->string('descripcion', 255)->nullable();
            $table->timestamps();
        });

        // 5. Table: inscripcion (Living student enrollment in a course group)
        Schema::create('inscripcion', function (Blueprint $table) {
            $table->foreignId('usuario_id')->constrained('usuario')->cascadeOnDelete();
            $table->foreignId('materia_grupo_id')->constrained('materia_grupo')->cascadeOnDelete();
            $table->foreignId('estado_inscripcion_id')->constrained('estado_inscripcion')->restrictOnDelete();
            $table->string('motivo_inhabilitacion', 255)->nullable();
            $table->timestamp('fecha_inscripcion')->useCurrent();
            $table->timestamps();

            $table->primary(['usuario_id', 'materia_grupo_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inscripcion');
        Schema::dropIfExists('estado_inscripcion');
        Schema::dropIfExists('materia_grupo');
        Schema::dropIfExists('materia');
        Schema::dropIfExists('estudiante');
    }
};
