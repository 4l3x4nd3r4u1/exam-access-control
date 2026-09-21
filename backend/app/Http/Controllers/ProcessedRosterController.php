<?php

namespace App\Http\Controllers;

use App\DTOs\ProcessedRosterSummary;
use App\Modules\CoreDataStorage;
use Illuminate\Http\JsonResponse;

class ProcessedRosterController extends Controller
{
    public function __construct(
        private readonly CoreDataStorage $storage
    ) {}

    /**
     * Endpoint to list all processed official rosters.
     */
    public function index(): JsonResponse
    {
        $rosters = $this->storage->getProcessedRosters();

        return response()->json([
            'success' => true,
            'data' => array_map(
                fn(ProcessedRosterSummary $roster) => [
                    'courseGroupId' => $roster->courseGroupId,
                    'subjectCode' => $roster->subjectCode,
                    'subjectName' => $roster->subjectName,
                    'groupCode' => $roster->groupCode,
                    'academicTerm' => $roster->academicTerm,
                    'totalStudents' => $roster->totalStudents,
                ],
                $rosters
            ),
            'message' => 'Planillas procesadas obtenidas exitosamente.',
        ], 200);
    }

    /**
     * Endpoint to get full roster detail with enrolled students.
     */
    public function show(string $courseGroupId): JsonResponse
    {
        $detail = $this->storage->getProcessedRosterDetail($courseGroupId);

        if (!$detail) {
            return response()->json([
                'success' => false,
                'message' => 'Planilla no encontrada.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $detail,
            'message' => 'Detalle de planilla procesada obtenido exitosamente.',
        ], 200);
    }

    /**
     * Endpoint to list enrolled students of a course group.
     */
    public function students(string $courseGroupId): JsonResponse
    {
        $students = $this->storage->getCourseStudents($courseGroupId);

        return response()->json([
            'success' => true,
            'data' => $students,
            'message' => 'Nómina de estudiantes obtenida exitosamente.',
        ], 200);
    }
}