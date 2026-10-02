<?php

namespace App\Http\Controllers;

use App\DTOs\ExamSummary;
use App\Modules\CoreDataStorage;
use Illuminate\Http\JsonResponse;

class ExamController extends Controller
{
    public function __construct(
        private readonly CoreDataStorage $storage
    ) {}

    /**
     * Endpoint to list all exams for a specific course group.
     */
    public function index(int $courseGroupId): JsonResponse
    {
        $exams = $this->storage->getExamsByCourseGroup($courseGroupId);

        return response()->json([
            'success' => true,
            'data' => array_map(fn(ExamSummary $exam) => $exam->toArray(), $exams),
            'message' => 'Exámenes obtenidos exitosamente.',
        ], 200);
    }
}
