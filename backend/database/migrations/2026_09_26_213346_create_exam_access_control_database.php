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
          Schema::create('usuario', function (Blueprint $table) {
          $table->id();
          $table->string('nombre');
          $table->string('contrasena');
          $table->boolean('activo')->default(true);
          $table->string('email')->unique();
          $table->string('ci')->unique();
          $table->timestamps();
    });


    Schema::create('sesion', function (Blueprint $table) {
        $table->id();

        $table->foreignId('usuario_id')
              ->constrained('usuario')
              ->cascadeOnDelete();

        $table->string('pid');
        $table->dateTime('fecha');
        $table->boolean('activo')->default(true);

        $table->timestamps();
    });


    Schema::create('rol', function (Blueprint $table) {
        $table->id();
        $table->string('nombre');
        $table->string('descripcion');
        $table->boolean('activo')->default(true);
        $table->timestamps();
    });


    Schema::create('usuario_rol', function (Blueprint $table) {

        $table->foreignId('usuario_id')
              ->constrained('usuario')
              ->cascadeOnDelete();

        $table->foreignId('rol_id')
              ->constrained('rol')
              ->cascadeOnDelete();

        $table->boolean('activo')->default(true);
        $table->dateTime('fecha_asignacion');

        $table->primary([
            'usuario_id',
            'rol_id'
        ]);
    });


    Schema::create('funcion', function (Blueprint $table) {
        $table->id();
        $table->string('nombre');
        $table->string('numero');
        $table->boolean('activo')->default(true);
        $table->timestamps();
    });


    Schema::create('rol_funcion', function (Blueprint $table) {

        $table->foreignId('rol_id')
              ->constrained('rol')
              ->cascadeOnDelete();

        $table->foreignId('funcion_id')
              ->constrained('funcion')
              ->cascadeOnDelete();

        $table->boolean('activo')->default(true);
        $table->dateTime('fecha_asignacion');

        $table->primary([
            'rol_id',
            'funcion_id'
        ]);
    });


    Schema::create('ui', function (Blueprint $table) {
        $table->id();
        $table->string('nombre');
        $table->string('descripcion');
        $table->boolean('activo')->default(true);
        $table->timestamps();
    });


    Schema::create('funcion_ui', function (Blueprint $table) {

        $table->foreignId('funcion_id')
              ->constrained('funcion')
              ->cascadeOnDelete();

        $table->foreignId('ui_id')
              ->constrained('ui')
              ->cascadeOnDelete();

        $table->boolean('activo')->default(true);
        $table->dateTime('fecha_asignacion');

        $table->primary([
            'funcion_id',
            'ui_id'
        ]);
    });
    Schema::create('estado_inscripcion', function (Blueprint $table) {
    $table->id();
    $table->string('nombre');
    $table->string('descripcion');
    $table->timestamps();
    });


Schema::create('materia', function (Blueprint $table) {
    $table->id();
    $table->string('sigla');
    $table->string('nombre');
    $table->boolean('activo')->default(true);
    $table->timestamps();
});


Schema::create('materia_grupo', function (Blueprint $table) {
    $table->id();

    $table->foreignId('materia_id')
          ->constrained('materia')
          ->cascadeOnDelete();

    $table->string('grupo');
    $table->string('gestion');

    $table->foreignId('docente_id')
          ->constrained('usuario')
          ->cascadeOnDelete();

    $table->boolean('activo')->default(true);

    $table->timestamps();

    $table->unique([
        'materia_id',
        'grupo',
        'gestion'
    ]);
});


Schema::create('estudiante', function (Blueprint $table) {

    $table->integer('codigo_sis')->primary();

    $table->foreignId('usuario_id')
      ->constrained('usuario')
      ->cascadeOnDelete();

      $table->timestamps();
  });


Schema::create('inscripcion', function (Blueprint $table) {

    $table->foreignId('usuario_id')
          ->constrained('usuario')
          ->cascadeOnDelete();

    $table->foreignId('materia_grupo_id')
          ->constrained('materia_grupo')
          ->cascadeOnDelete();

    $table->foreignId('estado_inscripcion_id')
          ->constrained('estado_inscripcion')
          ->cascadeOnDelete();

    $table->string('motivo_inhabilitacion')->nullable();

    $table->dateTime('fecha_inscripcion');

    $table->timestamps();

    $table->primary([
        'usuario_id',
        'materia_grupo_id'
    ]);
});
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
      Schema::dropIfExists('funcion_ui');
      Schema::dropIfExists('ui');
      Schema::dropIfExists('rol_funcion');
      Schema::dropIfExists('funcion');
      Schema::dropIfExists('usuario_rol');
      Schema::dropIfExists('rol');
      Schema::dropIfExists('sesion');
      Schema::dropIfExists('usuario');
      }
};
