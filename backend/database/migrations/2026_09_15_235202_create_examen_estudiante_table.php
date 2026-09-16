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
        Schema::create('examen_estudiante', function (Blueprint $table) {
            $table->bigInteger('id_examen');
            $table->bigInteger('id_estudiante')->index('idx_17299_idx_examen_estudiante_estudiante');
            $table->bigInteger('id_aula')->nullable()->index('idx_17299_idx_examen_estudiante_aula');
            $table->string('motivo_inhabilitacion')->nullable();

            $table->primary(['id_examen', 'id_estudiante']);
            $table->index(['id_examen', 'id_aula'], 'idx_17299_fk_examen_estudiante_examen_aula');
        });
        DB::statement("alter table \"examen_estudiante\" add column \"estado\" examen_estudiante_estado_t not null default 'HABILITADO'");
        DB::statement("create index \"idx_17299_idx_examen_estudiante_estado\" on \"examen_estudiante\" (\"id_examen\", \"estado\")");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('examen_estudiante');
    }
};
