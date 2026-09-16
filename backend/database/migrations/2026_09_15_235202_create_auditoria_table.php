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
        Schema::create('auditoria', function (Blueprint $table) {
            $table->bigIncrements('id_auditoria');
            $table->bigInteger('id_usuario')->index('idx_17225_idx_auditoria_usuario');
            $table->string('accion');
            $table->string('tabla_afectada')->nullable()->index('idx_17225_idx_auditoria_tabla');
            $table->decimal('id_registro')->nullable();
            $table->timestampTz('fecha_hora', 6)->useCurrent()->index('idx_17225_idx_auditoria_fecha');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('auditoria');
    }
};
