<?php

namespace App\Http\Controllers;

use App\Http\Requests\UpdateStudentStatusRequest;
use App\Modules\EligibilityEngine;
use Illuminate\Http\JsonResponse;

class StudentStatusController extends Controller
{
    public function __construct(
        private readonly EligibilityEngine $eligibilityEngine
    ) {}

    /**
     * Updates student eligibility status for a course group.
     */
    public function update(
        UpdateStudentStatusRequest $request,
        string $courseGroupId,
        string $studentKey
    ): JsonResponse {
        $result = $this->eligibilityEngine->updateStudentStatus(
            key: $studentKey,
            courseGroupId: $courseGroupId,
            status: $request->input('status'),
            reason: $request->input('reason')
        );

        $statusCode = $result->isSuccessful
            ? 200
            : (in_array($result->message, ['Estudiante no encontrado.', 'El estudiante no está inscrito en este grupo de materia.'], true) ? 404 : 400);

        return response()->json([
            'success' => $result->isSuccessful,
            'message' => $result->message,
            'timestamp' => $result->timestamp,
        ], $statusCode);
    }
}
