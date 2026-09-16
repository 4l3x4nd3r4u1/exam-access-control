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
            $table->bigIncrements('id_usuario');
            $table->bigInteger('id_rol')->index('idx_17437_idx_usuario_rol');
            $table->string('nombre');
            $table->string('apellido');
            $table->string('correo_electronico')->nullable();
            $table->string('usuario')->unique('idx_17437_uk_usuario_usuario');
            $table->string('contrasenia');
            $table->smallInteger('activo')->default(1);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('usuario');
    }
};
