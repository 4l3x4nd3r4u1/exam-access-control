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
        // 1. Table: tipo_examen (Exam type catalog: 1ER PARCIAL, 2DO PARCIAL, FINAL, etc.)
        Schema::create('tipo_examen', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 50)->unique();
            $table->timestamps();
        });

        // 2. Table: examen (Scheduled exams for a specific course group)
        Schema::create('examen', function (Blueprint $table) {
            $table->id();
            $table->foreignId('materia_grupo_id')->constrained('materia_grupo')->cascadeOnDelete();
            $table->foreignId('tipo_examen_id')->constrained('tipo_examen')->restrictOnDelete();
            $table->date('fecha');
            $table->time('hora_inicio');
            $table->time('hora_fin');
            $table->boolean('activo')->default(true);
            $table->timestamps();
        });

        // 3. Table: examen_norma (Rules and guidelines associated with an exam)
        Schema::create('examen_norma', function (Blueprint $table) {
            $table->id();
            $table->foreignId('examen_id')->constrained('examen')->cascadeOnDelete();
            $table->string('descripcion', 255);
            $table->timestamps();
        });

        // 4. Table: aula (Physical classrooms catalog with maximum capacity)
        Schema::create('aula', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 100)->unique();
            $table->integer('capacidad');
            $table->timestamps();
        });

        // 5. Table: examen_aula (Classroom allocation and supervisor assignment per exam)
        Schema::create('examen_aula', function (Blueprint $table) {
            $table->foreignId('examen_id')->constrained('examen')->cascadeOnDelete();
            $table->foreignId('aula_id')->constrained('aula')->cascadeOnDelete();
            $table->integer('cupo_asignado');
            $table->foreignId('auxiliar_id')->nullable()->constrained('usuario')->nullOnDelete();
            $table->timestamps();

            $table->primary(['examen_id', 'aula_id']);
        });

        // 6. Table: estado_examen_estudiante (Attendance status catalog: AUSENTE, PRESENTE, EXPULSADO, INGRESO_EXCEPCIONAL)
        Schema::create('estado_examen_estudiante', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 50)->unique();
            $table->string('descripcion', 255)->nullable();
            $table->timestamps();
        });

        // 7. Table: examen_estudiante (Distribution of students into exam rooms and real-time attendance)
        Schema::create('examen_estudiante', function (Blueprint $table) {
            $table->foreignId('examen_id')->constrained('examen')->cascadeOnDelete();
            $table->foreignId('usuario_id')->constrained('usuario')->cascadeOnDelete();
            $table->foreignId('aula_id')->nullable()->constrained('aula')->nullOnDelete();
            $table->foreignId('estado_id')->constrained('estado_examen_estudiante')->restrictOnDelete();
            $table->timestamp('hora_ingreso')->nullable();
            $table->text('observaciones')->nullable();
            $table->string('motivo_expulsion', 255)->nullable();
            $table->timestamps();

            $table->primary(['examen_id', 'usuario_id']);
        });

        // 8. Table: registro_acceso_examen (Immutable access control audit log)
        Schema::create('registro_acceso_examen', function (Blueprint $table) {
            $table->id();
            $table->foreignId('exam_id')->constrained('examen')->cascadeOnDelete();
            $table->foreignId('aula_id')->nullable()->constrained('aula')->nullOnDelete();
            $table->foreignId('user_id_estudiante')->constrained('usuario')->cascadeOnDelete();
            $table->foreignId('user_id_operador')->constrained('usuario')->cascadeOnDelete();
            $table->date('fecha');
            $table->time('hora');
            $table->string('resultado', 50); // PERMITIDO, DUPLICADO_BLOQUEADO, INHABILITADO, AULA_INCORRECTA, EXCEPCION
            $table->string('observacion', 255)->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('registro_acceso_examen');
        Schema::dropIfExists('examen_estudiante');
        Schema::dropIfExists('estado_examen_estudiante');
        Schema::dropIfExists('examen_aula');
        Schema::dropIfExists('aula');
        Schema::dropIfExists('examen_norma');
        Schema::dropIfExists('examen');
        Schema::dropIfExists('tipo_examen');
    }
};
