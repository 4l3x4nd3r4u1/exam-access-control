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
        // 1. Table: email (Institutional Whitelist / Catalog)
        Schema::create('email', function (Blueprint $table) {
            $table->id();
            $table->string('direccion', 150)->unique();
            $table->boolean('activo')->default(true);
            $table->timestamps();
        });

        // 2. Table: rol (Roles catalog)
        Schema::create('rol', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 50)->unique();
            $table->string('descripcion', 255)->nullable();
            $table->boolean('activo')->default(true);
            $table->timestamps();
        });

        // 3. Table: funcion (Fine-grained permissions/functions)
        Schema::create('funcion', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 100)->unique();
            $table->string('numero', 20)->nullable();
            $table->boolean('activo')->default(true);
            $table->timestamps();
        });

        // 4. Table: usuario (System accounts and personal identities)
        Schema::create('usuario', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 150);
            $table->string('contrasena', 255);
            $table->boolean('activo')->default(true);
            $table->string('ci', 30)->nullable()->unique();
            $table->foreignId('email_id')->constrained('email')->cascadeOnDelete();
            $table->timestamps();
        });

        // 5. Table: sesion (Active sessions tracking)
        Schema::create('sesion', function (Blueprint $table) {
            $table->id();
            $table->foreignId('usuario_id')->constrained('usuario')->cascadeOnDelete();
            $table->string('pid', 255)->nullable();
            $table->timestamp('fecha')->useCurrent();
            $table->boolean('activo')->default(true);
            $table->timestamps();
        });

        // 6. Table: usuario_rol (User-Role assignment)
        Schema::create('usuario_rol', function (Blueprint $table) {
            $table->foreignId('usuario_id')->constrained('usuario')->cascadeOnDelete();
            $table->foreignId('rol_id')->constrained('rol')->cascadeOnDelete();
            $table->boolean('activo')->default(true);
            $table->timestamp('fecha_asignacion')->useCurrent();
            $table->timestamps();

            $table->primary(['usuario_id', 'rol_id']);
        });

        // 7. Table: rol_funcion (Role-Function assignment)
        Schema::create('rol_funcion', function (Blueprint $table) {
            $table->foreignId('rol_id')->constrained('rol')->cascadeOnDelete();
            $table->foreignId('funcion_id')->constrained('funcion')->cascadeOnDelete();
            $table->boolean('activo')->default(true);
            $table->timestamp('fecha_asignacion')->useCurrent();
            $table->timestamps();

            $table->primary(['rol_id', 'funcion_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('rol_funcion');
        Schema::dropIfExists('usuario_rol');
        Schema::dropIfExists('sesion');
        Schema::dropIfExists('usuario');
        Schema::dropIfExists('funcion');
        Schema::dropIfExists('rol');
        Schema::dropIfExists('email');
    }
};
