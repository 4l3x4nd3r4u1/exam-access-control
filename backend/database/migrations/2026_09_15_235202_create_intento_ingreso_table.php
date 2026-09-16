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
        Schema::create('intento_ingreso', function (Blueprint $table) {
            $table->bigIncrements('id_intento_ingreso');
            $table->bigInteger('id_examen')->index('idx_17392_idx_intento_examen');
            $table->bigInteger('id_estudiante')->nullable()->index('idx_17392_idx_intento_estudiante');
            $table->string('codigo_ingresado')->nullable();
            $table->string('documento_ingresado')->nullable();
            $table->bigInteger('id_aula')->index('idx_17392_fk_intento_aula');
            $table->bigInteger('id_usuario')->index('idx_17392_fk_intento_usuario');
            $table->timestampTz('fecha_hora')->useCurrent()->index('idx_17392_idx_intento_fecha');
        });
        DB::statement("alter table \"intento_ingreso\" add column \"metodo_identificacion\" intento_ingreso_metodo_identificacion_t not null");
        DB::statement("alter table \"intento_ingreso\" add column \"resultado\" intento_ingreso_resultado_t not null");
        DB::statement("alter table \"intento_ingreso\" add column \"motivo_rechazo\" intento_ingreso_motivo_rechazo_t null");
        DB::statement("create index \"idx_17392_idx_intento_examen_resultado\" on \"intento_ingreso\" (\"id_examen\", \"resultado\")");
        DB::statement("create index \"idx_17392_idx_intento_motivo\" on \"intento_ingreso\" (\"motivo_rechazo\")");
        DB::statement("create index \"idx_17392_idx_intento_resultado\" on \"intento_ingreso\" (\"resultado\")");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('intento_ingreso');
    }
};
