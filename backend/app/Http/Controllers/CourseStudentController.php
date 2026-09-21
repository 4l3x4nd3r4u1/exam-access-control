<?php

namespace App\Http\Controllers;

use App\DTOs\EnrolledStudentSummary;
use App\Modules\CoreDataStorage;
use Illuminate\Http\JsonResponse;

class CourseStudentController extends Controller
{
    public function __construct(
        private readonly CoreDataStorage $storage
    ) {}

    /**
     * Retrieves the list of enrolled students with eligibility status for a course group.
     */
    public function index(string $courseGroupId): JsonResponse
    {
        $students = $this->storage->getEnrolledStudents($courseGroupId);

        return response()->json([
            'success' => true,
            'data' => array_map(fn(EnrolledStudentSummary $s) => $s->toArray(), $students),
            'message' => 'Estudiantes del curso obtenidos exitosamente.',
        ], 200);
    }
}
