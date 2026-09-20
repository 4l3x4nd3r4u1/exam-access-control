<?php

namespace App\Http\Controllers;

use App\DTOs\UserSummary;
use App\Modules\CoreDataStorage;
use Illuminate\Http\JsonResponse;

class AcademicStaffController extends Controller
{
    public function __construct(
        private readonly CoreDataStorage $storage
    ) {}

    /**
     * Endpoint to list active academic staff members ordered alphabetically.
     */
    public function index(): JsonResponse
    {
        $staff = $this->storage->getAcademicStaff();

        return response()->json([
            'success' => true,
            'data' => array_map(fn(UserSummary $user) => $user->toArray(), $staff),
            'message' => 'Personal académico obtenido exitosamente.',
        ], 200);
    }
}
