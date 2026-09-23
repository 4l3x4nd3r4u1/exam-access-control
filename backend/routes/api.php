<?php

use App\Http\Controllers\AcademicStaffController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\StudentRosterController;
use App\Http\Controllers\TeacherCourseController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AcademicUserController;
use App\Http\Controllers\CourseStudentController;
use App\Http\Controllers\ProcessedRosterController;
use App\Http\Controllers\StudentStatusController;

Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
        'message' => 'Exam Access Control API is running',
        'timestamp' => now()->toIso8601String()
    ]);
});

Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/students/import', [StudentRosterController::class, 'import']);
Route::post('/courses/import-roster', [StudentRosterController::class, 'import']);
Route::get('/courses/roster-template', [StudentRosterController::class, 'template']);
Route::get('/students/roster-template', [StudentRosterController::class, 'template']);
Route::get('/academic-staff', [AcademicStaffController::class, 'index']);
Route::get('/teachers/{teacherId}/courses', [TeacherCourseController::class, 'index']);
Route::post('/academic-users', [AcademicUserController::class, 'store']);
Route::put('/academic-users/{userId}', [AcademicUserController::class, 'update']);
Route::get('/processed-rosters', [ProcessedRosterController::class, 'index']);
Route::get('/courses/{courseGroupId}/students', [CourseStudentController::class, 'index'])
    ->where('courseGroupId', '[A-Za-z0-9\-_]+(\/[0-9]+)?');
Route::put('/courses/{courseGroupId}/students/{studentKey}/status', [StudentStatusController::class, 'update'])
    ->where('courseGroupId', '[A-Za-z0-9\-_]+(\/[0-9]+)?');


