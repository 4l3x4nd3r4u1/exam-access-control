<?php

use App\Http\Controllers\AcademicStaffController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\StudentRosterController;
use App\Http\Controllers\TeacherCourseController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AcademicUserController;
use App\Http\Controllers\ProcessedRosterController;

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
Route::put('/academic-staff/{id}', [AcademicStaffController::class, 'update']);
Route::get('/teachers/{teacherId}/courses', [TeacherCourseController::class, 'index']);
Route::post('/academic-users', [AcademicUserController::class, 'store']);
Route::get('/processed-rosters', [ProcessedRosterController::class, 'index']);

