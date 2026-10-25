<?php

namespace App\Http\Controllers;

use App\Http\Requests\RegisterExceptionalEntryRequest;
use App\Modules\CoreDataStorage;
use Illuminate\Http\JsonResponse;

class ExceptionalEntryController extends Controller
{
    public function __construct(
        private readonly CoreDataStorage $storage
    ) {}

    public function store(RegisterExceptionalEntryRequest $request): JsonResponse
    {
        $result = $this->storage->registerExceptionalEntry(
            identifier: $request->input('identifier'),
            examId: (int) $request->input('exam_id'),
            observation: $request->input('observation'),
        );

        return response()->json($result->toArray(), $result->httpStatus);
    }
}
