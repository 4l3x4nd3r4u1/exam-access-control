<?php

use App\Http\Controllers\AcademicStaffController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CatalogController;
use App\Http\Controllers\CourseGroupController;
use App\Http\Controllers\ExamController;
use App\Http\Controllers\StudentRosterController;
use App\Http\Controllers\TeacherCourseController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AcademicUserController;
use App\Http\Controllers\CourseStudentController;
use App\Http\Controllers\ProcessedRosterController;
use App\Http\Controllers\StudentStatusController;
use App\Http\Controllers\StudentCourseGroupController;

Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
        'message' => 'Exam Access Control API is running',
        'timestamp' => now()->toIso8601String()
    ]);
});

Route::post('/auth/login', [AuthController::class, 'login']);
// rehacer
Route::post('/student-roster/import', [StudentRosterController::class, 'import']);

Route::get('/student-roster/template', [StudentRosterController::class, 'template']);

Route::middleware('auth.jwt')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::put('/academic-users/me', [AcademicUserController::class, 'updatePersonalData']);
    Route::put('/academic-users/{userId}/roles', [AcademicUserController::class, 'updateUserRoles'])
        ->where('userId', '[0-9]+');
    Route::post('/academic-users', [AcademicUserController::class, 'store']);
});

Route::get('/academic-staff', [AcademicStaffController::class, 'list']);

Route::get('/teachers/{teacherId}/courses', [TeacherCourseController::class, 'index']);

Route::middleware('auth.jwt')->group(function () {
    Route::get('/processed-rosters', [ProcessedRosterController::class, 'index']);
    Route::get('/processed-rosters/{courseGroupId}', [ProcessedRosterController::class, 'show'])
        ->where('courseGroupId', '[0-9]+');
    Route::get('/courses/{courseGroupId}/students', [CourseStudentController::class, 'index'])
        ->where('courseGroupId', '[0-9]+');
    Route::get('/rooms/available', [ExamController::class, 'availableRooms']);
    Route::get('/course-groups', [CourseGroupController::class, 'index']);
    Route::get('/courses/{courseGroupId}/exams', [ExamController::class, 'index'])
        ->where('courseGroupId', '[0-9]+');
    Route::post('/courses/{courseGroupId}/exams', [ExamController::class, 'store'])
        ->where('courseGroupId', '[0-9]+');
    Route::put('/courses/{courseGroupId}/students/{userId}/status', [StudentStatusController::class, 'update'])
        ->where('courseGroupId', '[0-9]+')
        ->where('userId', '[0-9]+');
    Route::get('/courses/{courseGroupId}/check-enrollment', [StudentCourseGroupController::class, 'checkEnrollment'])
        ->where('courseGroupId', '[0-9]+');
});

/**
 * Catalog/Lookup tables endpoints for select inputs
 */
Route::prefix('catalog')->group(function () {
    Route::get('/roles', [CatalogController::class, 'roles']);
    Route::get('/exam-student-statuses', [CatalogController::class, 'examStudentStatuses']);
    Route::get('/enrollment-statuses', [CatalogController::class, 'enrollmentStatuses']);
    Route::get('/exam-types', [CatalogController::class, 'examTypes']);
    Route::get('/rooms', [CatalogController::class, 'rooms']);
    Route::get('/courses', [CatalogController::class, 'courses']);
    Route::get('/course-groups', [CatalogController::class, 'courseGroups']);
    Route::get('/functions', [CatalogController::class, 'functions']);
    Route::get('/emails', [CatalogController::class, 'emails']);
    Route::get('/user-roles', [CatalogController::class, 'userRoles']);
});
