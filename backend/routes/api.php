<?php

use App\Http\Controllers\AcademicStaffController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\StudentRosterController;
use App\Http\Controllers\TeacherCourseController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
        'message' => 'Exam Access Control API is running',
        'timestamp' => now()->toIso8601String()
    ]);
});

Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/students/import', [StudentRosterController::class, 'import']);
Route::get('/academic-staff', [AcademicStaffController::class, 'index']);
Route::get('/teachers/{teacherId}/courses', [TeacherCourseController::class, 'index']);


