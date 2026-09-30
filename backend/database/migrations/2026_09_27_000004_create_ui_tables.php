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
        // 1. Table: ui (Frontend views, screens and UI components catalog)
        Schema::create('ui', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 100)->unique();
            $table->string('descripcion', 255)->nullable();
            $table->boolean('activo')->default(true);
            $table->timestamps();
        });

        // 2. Table: funcion_ui (Function-UI assignment)
        Schema::create('funcion_ui', function (Blueprint $table) {
            $table->foreignId('funcion_id')->constrained('funcion')->cascadeOnDelete();
            $table->foreignId('ui_id')->constrained('ui')->cascadeOnDelete();
            $table->boolean('activo')->default(true);
            $table->timestamp('fecha_asignacion')->useCurrent();
            $table->timestamps();

            $table->primary(['funcion_id', 'ui_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('funcion_ui');
        Schema::dropIfExists('ui');
    }
};
