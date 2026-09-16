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
        Schema::create('examen', function (Blueprint $table) {
            $table->bigIncrements('id_examen');
            $table->bigInteger('id_usuario')->index('idx_17274_fk_examen_usuario1_idx');
            $table->bigInteger('id_materia')->index('idx_17274_idx_examen_materia');
            $table->string('titulo');
            $table->date('fecha')->index('idx_17274_idx_examen_fecha');
            $table->time('hora_inicio');
            $table->time('hora_fin');
        });
        DB::statement("alter table \"examen\" add column \"estado\" examen_estado_t not null default 'PROGRAMADO'");
        DB::statement("create index \"idx_17274_idx_examen_estado\" on \"examen\" (\"estado\")");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('examen');
    }
};
