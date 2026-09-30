<?php

namespace App\Http\Controllers;

use App\DTOs\ExamSummary;
use App\Http\Requests\ScheduleExamRequest;
use App\Modules\CoreDataStorage;
use Illuminate\Http\JsonResponse;

class ExamController extends Controller
{
    public function __construct(
        private readonly CoreDataStorage $storage
    ) {}

    /**
     * Retrieves the list of scheduled exams for a course group.
     */
    public function index(string $courseGroupId): JsonResponse
    {
        $exams = $this->storage->getCourseExams($courseGroupId);

        return response()->json([
            'success' => true,
            'data' => array_map(fn(ExamSummary $exam) => $exam->toArray(), $exams),
            'message' => 'Exámenes del curso obtenidos exitosamente.',
        ], 200);
    }

    /**
     * Schedules a new exam for a course group.
     */
    public function store(ScheduleExamRequest $request, string $courseGroupId): JsonResponse
    {
        $data = $request->toDTO();
        $result = $this->storage->scheduleExam($courseGroupId, $data);

        return response()->json([
            'success' => $result->isSuccessful,
            'message' => $result->message,
            'timestamp' => $result->timestamp,
        ], $result->isSuccessful ? 201 : 400);
    }
}
