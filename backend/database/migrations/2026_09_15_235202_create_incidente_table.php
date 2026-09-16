<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('incidente', function (Blueprint $table) {
            $table->bigIncrements('id_incidente');
            $table->bigInteger('id_examen')->index('idx_17344_idx_incidente_examen');
            $table->bigInteger('id_estudiante')->nullable()->index('idx_17344_idx_incidente_estudiante');
            $table->bigInteger('id_usuario')->index('idx_17344_fk_incidente_usuario');
            $table->bigInteger('id_aula_anterior')->nullable()->index('idx_17344_fk_incidente_aula_anterior');
            $table->bigInteger('id_aula_nueva')->nullable()->index('idx_17344_fk_incidente_aula_nueva');
            $table->string('descripcion');
            $table->timestampTz('fecha_hora')->useCurrent()->index('idx_17344_idx_incidente_fecha');
        });
        DB::statement("alter table \"incidente\" add column \"tipo\" incidente_tipo_t not null");
        DB::statement("alter table \"incidente\" add column \"accion_tomada\" incidente_accion_tomada_t not null default 'NINGUNA'");
        DB::statement("create index \"idx_17344_idx_incidente_tipo\" on \"incidente\" (\"tipo\")");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('incidente');
    }
};
