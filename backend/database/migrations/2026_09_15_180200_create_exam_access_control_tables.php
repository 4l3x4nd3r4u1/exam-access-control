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
        // 1. Update 'users' table if it already exists, or create if not
        if (Schema::hasTable('users')) {
            Schema::table('users', function (Blueprint $table) {
                if (!Schema::hasColumn('users', 'role')) {
                    $table->string('role', 20)->default('TEACHER')->after('email'); // ADMIN, TEACHER, ASSISTANT
                }
                if (!Schema::hasColumn('users', 'is_active')) {
                    $table->boolean('is_active')->default(true)->after('role');
                }
            });
        } else {
            Schema::create('users', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('email')->unique();
                $table->string('role', 20)->default('TEACHER');
                $table->boolean('is_active')->default(true);
                $table->timestamp('email_verified_at')->nullable();
                $table->string('password');
                $table->rememberToken();
                $table->timestamps();
            });
        }

        // 2. Table: students (Institutional Student Roster)
        if (!Schema::hasTable('students')) {
            Schema::create('students', function (Blueprint $table) {
                $table->string('student_key', 50)->primary(); // Institutional SIS Code
                $table->string('ci', 30)->unique(); // Identity Card
                $table->string('full_name', 150);
                $table->timestamps();
            });
        }

        // 3. Table: course_groups (Academic Course & Group Offerings)
        if (!Schema::hasTable('course_groups')) {
            Schema::create('course_groups', function (Blueprint $table) {
                $table->string('course_group_id', 100)->primary(); // e.g. 'INF110-G1-2/2026'
                $table->string('subject_code', 30); // e.g. 'INF110'
                $table->string('subject_name', 150); // e.g. 'Introducción a la Programación'
                $table->string('group_code', 20); // e.g. '1'
                $table->string('academic_term', 30); // e.g. '2/2026'
                $table->foreignId('teacher_id')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
            });
        }

        // 4. Table: student_course_enrollments (Living Enrollment & Eligibility List)
        if (!Schema::hasTable('student_course_enrollments')) {
            Schema::create('student_course_enrollments', function (Blueprint $table) {
                $table->string('student_key', 50);
                $table->string('course_group_id', 100);
                $table->string('status', 20)->default('ELIGIBLE'); // ELIGIBLE, INELIGIBLE
                $table->text('ineligibility_reason')->nullable();
                $table->timestamps();

                $table->primary(['student_key', 'course_group_id']);
                $table->foreign('student_key')->references('student_key')->on('students')->cascadeOnDelete();
                $table->foreign('course_group_id')->references('course_group_id')->on('course_groups')->cascadeOnDelete();
            });
        }

        // 5. Table: rooms (Physical Classroom Inventory)
        if (!Schema::hasTable('rooms')) {
            Schema::create('rooms', function (Blueprint $table) {
                $table->string('id', 50)->primary(); // e.g. 'AULA_691B'
                $table->string('room_name', 100);
                $table->integer('max_capacity');
                $table->timestamps();
            });
        }

        // 6. Table: exams (Scheduled Examinations)
        if (!Schema::hasTable('exams')) {
            Schema::create('exams', function (Blueprint $table) {
                $table->id();
                $table->string('course_group_id', 100);
                $table->string('title', 150);
                $table->date('exam_date');
                $table->time('start_time');
                $table->time('end_time');
                $table->timestamps();

                $table->foreign('course_group_id')->references('course_group_id')->on('course_groups')->cascadeOnDelete();
            });
        }

        // 7. Table: exam_rules (Exam Rules & Guidelines)
        if (!Schema::hasTable('exam_rules')) {
            Schema::create('exam_rules', function (Blueprint $table) {
                $table->id();
                $table->foreignId('exam_id')->constrained('exams')->cascadeOnDelete();
                $table->string('rule_description', 255);
                $table->timestamps();
            });
        }

        // 8. Table: exam_rooms (Room Allocations per Exam)
        if (!Schema::hasTable('exam_rooms')) {
            Schema::create('exam_rooms', function (Blueprint $table) {
                $table->foreignId('exam_id')->constrained('exams')->cascadeOnDelete();
                $table->string('room_id', 50);
                $table->integer('assigned_capacity');
                $table->timestamps();

                $table->primary(['exam_id', 'room_id']);
                $table->foreign('room_id')->references('id')->on('rooms')->cascadeOnDelete();
            });
        }

        // 9. Table: exam_students (Capacity Distribution & Real-Time Attendance)
        if (!Schema::hasTable('exam_students')) {
            Schema::create('exam_students', function (Blueprint $table) {
                $table->foreignId('exam_id')->constrained('exams')->cascadeOnDelete();
                $table->string('student_key', 50);
                $table->string('assigned_room_id', 50)->nullable();
                $table->timestamp('check_in_time')->nullable();
                $table->string('attendance_status', 30)->default('ABSENT'); // ABSENT, CHECKED_IN, EXPELLED, EXCEPTIONAL_CHECK_IN
                $table->timestamp('expulsion_time')->nullable();
                $table->text('incident_reason')->nullable();
                $table->timestamps();

                $table->primary(['exam_id', 'student_key']);
                $table->foreign('student_key')->references('student_key')->on('students')->cascadeOnDelete();
                $table->foreign('assigned_room_id')->references('id')->on('rooms')->nullOnDelete();
            });
        }

        // 10. Table: access_audit_logs (Immutable Append-Only Audit Log)
        if (!Schema::hasTable('access_audit_logs')) {
            Schema::create('access_audit_logs', function (Blueprint $table) {
                $table->id();
                $table->string('raw_id', 100);
                $table->string('student_key', 50)->nullable();
                $table->foreignId('exam_id')->nullable()->constrained('exams')->nullOnDelete();
                $table->string('room_id', 50)->nullable();
                $table->string('event_type', 30); // BLOCKED_DUPLICATE, UNAUTHORIZED, EXPULSION, TEACHER_EXCEPTION
                $table->text('reason_details');
                $table->foreignId('supervisor_id')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('recorded_at')->useCurrent();
                $table->timestamps();

                $table->foreign('room_id')->references('id')->on('rooms')->nullOnDelete();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('access_audit_logs');
        Schema::dropIfExists('exam_students');
        Schema::dropIfExists('exam_rooms');
        Schema::dropIfExists('exam_rules');
        Schema::dropIfExists('exams');
        Schema::dropIfExists('rooms');
        Schema::dropIfExists('student_course_enrollments');
        Schema::dropIfExists('course_groups');
        Schema::dropIfExists('students');

        if (Schema::hasTable('users')) {
            Schema::table('users', function (Blueprint $table) {
                if (Schema::hasColumn('users', 'role')) {
                    $table->dropColumn('role');
                }
                if (Schema::hasColumn('users', 'is_active')) {
                    $table->dropColumn('is_active');
                }
            });
        }
    }
};
