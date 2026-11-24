<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('control_point_rotation_requests', function (Blueprint $table) {
            $table->id();

            $table->foreignId('requester_assignment_id')
                ->constrained('control_point_assignments')
                ->cascadeOnDelete();

            $table->foreignId('receiver_assignment_id')
                ->constrained('control_point_assignments')
                ->cascadeOnDelete();

            $table->string('status', 20)->default('PENDING');
            $table->timestamp('responded_at')->nullable();
            $table->timestamps();

            $table->index(['requester_assignment_id', 'status']);
            $table->index(['receiver_assignment_id', 'status']);
        });

        DB::statement("
            ALTER TABLE control_point_rotation_requests
            ADD CONSTRAINT control_point_rotation_status_check
            CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED'))
        ");

        DB::statement("
            ALTER TABLE control_point_rotation_requests
            ADD CONSTRAINT control_point_rotation_assignments_check
            CHECK (requester_assignment_id <> receiver_assignment_id)
        ");
    }

    public function down(): void
    {
        Schema::dropIfExists('control_point_rotation_requests');
    }
};