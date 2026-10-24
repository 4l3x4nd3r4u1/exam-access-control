<?php

namespace App\Http\Controllers;

use App\Http\Requests\CheckExamAccessRequest;
use App\Modules\CoreDataStorage;
use Illuminate\Http\JsonResponse;

class ExamAccessController extends Controller
{
    public function __construct(
        private readonly CoreDataStorage $storage
    ) {}

    public function check(CheckExamAccessRequest $request): JsonResponse
    {
        $result = $this->storage->checkExamAccess(
            identifier: trim($request->input('identifier')),
            examId: (int) $request->input('exam_id'),
            roomId: (int) $request->input('room_id'),
        );

        return response()->json($result->toArray(), $result->httpStatus);
    }
}
