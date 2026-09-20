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
}