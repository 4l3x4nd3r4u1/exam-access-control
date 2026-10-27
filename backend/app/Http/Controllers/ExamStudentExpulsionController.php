<?php

namespace App\Http\Controllers;

use App\Http\Requests\RegisterExamStudentExpulsionRequest;
use App\Modules\CoreDataStorage;
use Illuminate\Http\JsonResponse;

class ExamStudentExpulsionController extends Controller
{
    public function __construct(
        private readonly CoreDataStorage $storage
    ) {}

    public function store(RegisterExamStudentExpulsionRequest $request): JsonResponse
    {
        $result = $this->storage->registerExamStudentExpulsion(
            identifier: $request->input('identifier'),
            examId: (int) $request->input('exam_id'),
            reason: $request->input('reason'),
        );

        return response()->json($result->toArray(), $result->httpStatus);
    }
}
