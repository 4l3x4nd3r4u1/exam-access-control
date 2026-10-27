<?php

namespace App\Http\Controllers;

use App\DTOs\UserSummary;
use App\Modules\CoreDataStorage;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Throwable;

class AcademicStaffController extends Controller
{
    public function __construct(
        private readonly CoreDataStorage $storage
    ) {}

    /**
     * Endpoint to list active academic staff members ordered alphabetically.
     */
    public function list(): JsonResponse
    {
        try {
            $staff = $this->storage->getAcademicStaff();

            return response()->json([
                'success' => true,
                'data' => array_map(fn(UserSummary $user) => $user->toArray(), $staff),
                'message' => 'Personal académico obtenido exitosamente.',
            ], 200);
        } catch (Throwable $e) {
            Log::error('Error listing academic staff: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener el personal académico.',
            ], 500);
        }
    }
}
