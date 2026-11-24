<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('control_points', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('exam_id');
            $table->unsignedBigInteger('room_id');
            $table->string('control_type', 30);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->foreign(['exam_id', 'room_id'])
                ->references(['examen_id', 'aula_id'])
                ->on('examen_aula')
                ->cascadeOnDelete();

            $table->unique(
                ['exam_id', 'room_id', 'control_type'],
                'control_points_exam_room_type_unique'
            );
        });

        Schema::create('control_point_assignments', function (Blueprint $table) {
            $table->id();

            $table->foreignId('control_point_id')
                ->constrained('control_points')
                ->cascadeOnDelete();

            $table->foreignId('user_id')
                ->constrained('usuario')
                ->restrictOnDelete();

            $table->timestamp('started_at');
            $table->timestamp('ended_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'ended_at']);
            $table->index(['control_point_id', 'ended_at']);
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement("
                ALTER TABLE control_points
                ADD CONSTRAINT control_points_type_check
                CHECK (control_type IN ('ENTRY', 'DURING_EXAM'))
            ");

            DB::statement("
                ALTER TABLE control_point_assignments
                ADD CONSTRAINT control_point_assignments_dates_check
                CHECK (
                    ended_at IS NULL
                    OR ended_at >= started_at
                )
            ");
        }

        if (DB::getDriverName() === 'sqlite') {
            foreach (['INSERT', 'UPDATE'] as $event) {
                $suffix = strtolower($event);

                DB::statement("
                    CREATE TRIGGER control_points_type_check_{$suffix}
                    BEFORE {$event} ON control_points
                    FOR EACH ROW
                    WHEN NEW.control_type NOT IN ('ENTRY', 'DURING_EXAM')
                    BEGIN
                        SELECT RAISE(ABORT, 'Invalid control type');
                    END
                ");

                DB::statement("
                    CREATE TRIGGER control_point_assignments_dates_check_{$suffix}
                    BEFORE {$event} ON control_point_assignments
                    FOR EACH ROW
                    WHEN NEW.ended_at IS NOT NULL
                    AND NEW.ended_at < NEW.started_at
                    BEGIN
                        SELECT RAISE(ABORT, 'Invalid assignment dates');
                    END
                ");
            }
        }

        DB::statement("
            CREATE UNIQUE INDEX control_point_assignments_active_unique
            ON control_point_assignments (control_point_id, user_id)
            WHERE ended_at IS NULL
        ");
    }

    public function down(): void
    {
        Schema::dropIfExists('control_point_assignments');
        Schema::dropIfExists('control_points');
    }
};