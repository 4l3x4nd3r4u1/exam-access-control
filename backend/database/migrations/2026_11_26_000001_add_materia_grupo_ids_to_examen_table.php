<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('examen')) {
            Schema::table('examen', function (Blueprint $table) {
                if (!Schema::hasColumn('examen', 'materia_grupo_ids')) {
                    $table->json('materia_grupo_ids')->nullable();
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('examen')) {
            Schema::table('examen', function (Blueprint $table) {
                if (Schema::hasColumn('examen', 'materia_grupo_ids')) {
                    $table->dropColumn('materia_grupo_ids');
                }
            });
        }
    }
};
