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
        int $courseGroupId,
        string $studentKey
    ): JsonResponse {
        $studentId = (int) $studentKey;

        $result = $this->eligibilityEngine->updateStudentStatus(
            $studentId,
            $courseGroupId,
            $request->input('status'),
            $request->input('reason')
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
