<?php

namespace App\Http\Controllers;

use App\DTOs\CourseGroupSummary;
use App\Modules\CoreDataStorage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CourseGroupController extends Controller
{
    public function __construct(
        private readonly CoreDataStorage $storage
    ) {}

    /**
     * List all course groups (materia_grupo) with optional filters.
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $gestion = $request->query('gestion');
            $sigla = $request->query('sigla');
            $courses = $this->storage->getAllCourseGroups($gestion, $sigla);

            return response()->json([
                'success' => true,
                'data' => array_map(fn(CourseGroupSummary $course) => $course->toArray(), $courses),
                'message' => 'Grupos de materia obtenidos exitosamente.',
            ], 200);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('Error listing course groups: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener los grupos de materia.',
            ], 500);
        }
    }
}