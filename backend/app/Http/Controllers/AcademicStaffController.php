<?php

namespace App\Http\Controllers;

use App\DTOs\UserSummary;
use App\Modules\CoreDataStorage;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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

    /**
     * Endpoint to update academic staff member details.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $user = User::find($id);
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Usuario no encontrado.',
            ], 404);
        }

        $user->name = $request->input('fullName') ?? $request->input('full_name') ?? $user->name;
        $user->email = $request->input('email') ?? $user->email;
        $user->role = $request->input('role') ?? $user->role;
        $user->save();

        return response()->json([
            'success' => true,
            'message' => 'Usuario actualizado exitosamente.',
            'data' => [
                'userId' => $user->id,
                'fullName' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'isActive' => (bool)$user->is_active,
                'user_id' => $user->id,
                'full_name' => $user->name,
                'is_active' => (bool)$user->is_active,
            ]
        ], 200);
    }
}
