<?php

namespace App\Http\Controllers;

use App\Modules\CoreDataStorage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StudentCourseGroupController extends Controller
{
    public function __construct(
        private readonly CoreDataStorage $storage
    ) {}

    /**
     * Check if a student (by codigo_sis) belongs to a course group.
     */
    public function checkEnrollment(int $courseGroupId, Request $request): JsonResponse
    {
        $codigoSis = $request->query('codigo_sis');
        
        if (!$codigoSis) {
            return response()->json([
                'success' => false,
                'message' => 'codigo_sis query parameter is required.',
            ], 422);
        }

        $result = $this->storage->checkStudentBelongsToCourseGroup(
            $codigoSis, 
            $courseGroupId
        );

        return response()->json([
            'success' => $result['belongs'],
            'message' => $result['message'],
            'data' => $result['enrollment'] ?? null,
        ], $result['belongs'] ? 200 : 404);
    }
}