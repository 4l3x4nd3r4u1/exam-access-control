<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('examen_estudiante', function (Blueprint $table) {
            $table->string('norma_particular', 255)->nullable()->after('observaciones');
        });
    }

    public function down(): void
    {
        Schema::table('examen_estudiante', function (Blueprint $table) {
            $table->dropColumn('norma_particular');
        });
    }
};
