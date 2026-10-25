<?php

namespace App\Http\Controllers;

use App\Http\Requests\CheckDuringExamRequest;
use App\Modules\CoreDataStorage;
use Illuminate\Http\JsonResponse;

class DuringExamController extends Controller
{
    public function __construct(
        private readonly CoreDataStorage $storage
    ) {}

    public function check(CheckDuringExamRequest $request): JsonResponse
    {
        $result = $this->storage->checkDuringExam(
            identifier: $request->input('identifier'),
            examId: (int) $request->input('exam_id'),
        );

        return response()->json($result->toArray(), $result->httpStatus);
    }
}
