<?php

use App\Http\Controllers\AcademicStaffController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ImportedPlanController;
use App\Http\Controllers\StudentRosterController;
use App\Http\Controllers\TeacherCourseController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AcademicUserController;

Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
        'message' => 'Exam Access Control API is running',
        'timestamp' => now()->toIso8601String()
    ]);
});

Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/students/import', [StudentRosterController::class, 'import']);
Route::get('/imported-plans', [ImportedPlanController::class, 'index']);
Route::get('/imported-plans/{courseGroupId}', [ImportedPlanController::class, 'show'])->where('courseGroupId', '.*');
Route::get('/academic-staff', [AcademicStaffController::class, 'index']);
Route::get('/teachers/{teacherId}/courses', [TeacherCourseController::class, 'index']);
Route::post('/academic-users', [AcademicUserController::class, 'store']);


