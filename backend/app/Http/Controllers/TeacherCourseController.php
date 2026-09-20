<?php

namespace App\Http\Controllers;

use App\DTOs\CourseGroupSummary;
use App\Modules\CoreDataStorage;
use Illuminate\Http\JsonResponse;

class TeacherCourseController extends Controller
{
    public function __construct(
        private readonly CoreDataStorage $storage
    ) {}

    /**
     * Endpoint to list all courses assigned to a teacher.
     */
    public function index(int $teacherId): JsonResponse
    {
        $courses = $this->storage->getTeacherCourses($teacherId);

        return response()->json([
            'success' => true,
            'data' => array_map(fn(CourseGroupSummary $course) => $course->toArray(), $courses),
            'message' => 'Materias del docente obtenidas exitosamente.',
        ], 200);
    }
}
