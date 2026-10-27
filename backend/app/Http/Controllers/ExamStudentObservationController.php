<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreExamStudentObservationRequest;
use App\Modules\CoreDataStorage;
use Illuminate\Http\JsonResponse;

class ExamStudentObservationController extends Controller
{
    public function __construct(
        private readonly CoreDataStorage $storage
    ) {}

    public function store(StoreExamStudentObservationRequest $request): JsonResponse
    {
        $result = $this->storage->storeExamStudentObservation(
            identifier: $request->input('identifier'),
            examId: (int) $request->input('exam_id'),
            observation: $request->input('observation'),
        );

        return response()->json($result->toArray(), $result->httpStatus);
    }
}
