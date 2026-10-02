<?php

namespace App\Http\Controllers;

use App\DTOs\CourseGroupSummary;
use App\Modules\CoreDataStorage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Throwable;

class TeacherCourseController extends Controller
{
    public function __construct(
        private readonly CoreDataStorage $storage
    ) {}

    /**
     * Endpoint to list all courses assigned to a teacher.
     * Optional query parameter: gestion (e.g., 2/2026)
     */
    public function index(int $teacherId, Request $request): JsonResponse
    {
        try {
            $gestion = $request->query('gestion');
            $courses = $this->storage->getTeacherCourses($teacherId, $gestion);

            return response()->json([
                'success' => true,
                'data' => array_map(fn(CourseGroupSummary $course) => $course->toArray(), $courses),
                'message' => 'Materias del docente obtenidas exitosamente.',
            ], 200);
        } catch (Throwable $e) {
            Log::error('Error listing teacher courses: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener las materias.',
            ], 500);
        }
    }
}
