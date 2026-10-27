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
            'data' => array_map(fn(ProcessedRosterSummary $roster) => $roster->toArray(), $rosters),
            'message' => 'Planillas procesadas obtenidas exitosamente.',
        ], 200);
    }

    /**
     * Endpoint to get detail of a specific processed roster.
     */
    public function show(int $courseGroupId): JsonResponse
    {
        $detail = $this->storage->getProcessedRosterDetail($courseGroupId);

        if (!$detail) {
            return response()->json([
                'success' => false,
                'message' => 'Planilla no encontrada',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $detail->toArray(),
            'message' => 'Detalle de planilla obtenido exitosamente.',
        ], 200);
    }
}
