<?php

namespace App\Http\Controllers;

use App\DTOs\ImportedPlanSummary;
use App\Modules\CoreDataStorage;
use Illuminate\Http\JsonResponse;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;
use Throwable;

class ImportedPlanController extends Controller
{
    public function __construct(
        private readonly CoreDataStorage $storage
    ) {}

    public function index(): JsonResponse
    {
        if (!$this->authenticatedUser()) {
            return $this->unauthorizedResponse();
        }

        $plans = $this->storage->getImportedPlans();

        return response()->json([
            'success' => true,
            'data' => [
                'total' => count($plans),
                'plans' => array_map(fn(ImportedPlanSummary $plan) => $plan->toArray(), $plans),
            ],
            'message' => 'Planillas importadas obtenidas exitosamente.',
        ], 200);
    }

    public function show(string $courseGroupId): JsonResponse
    {
        if (!$this->authenticatedUser()) {
            return $this->unauthorizedResponse();
        }

        $detail = $this->storage->getImportedPlanDetail($courseGroupId);

        if ($detail === null) {
            return response()->json([
                'success' => false,
                'message' => 'Planilla importada no encontrada.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $detail->toArray(),
            'message' => 'Detalle de planilla importada obtenido exitosamente.',
        ], 200);
    }

    private function authenticatedUser(): bool
    {
        try {
            return JWTAuth::parseToken()->authenticate() !== false;
        } catch (Throwable) {
            return false;
        }
    }

    private function unauthorizedResponse(): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => 'No autenticado.',
        ], 401);
    }
}
