<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Modules\CoreDataStorage;
use Illuminate\Http\JsonResponse;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;
use Throwable;

class TeacherSubjectController extends Controller
{
    public function __construct(
        private readonly CoreDataStorage $storage
    ) {}

    public function index(): JsonResponse
    {
        $user = $this->authenticatedTeacher();

        if ($user instanceof JsonResponse) {
            return $user;
        }

        $overview = $this->storage->getAuthenticatedTeacherSubjects($user);

        return response()->json([
            'success' => true,
            'data' => $overview->toArray(),
            'message' => 'Materias asignadas obtenidas exitosamente.',
        ], 200);
    }

    public function show(string $courseGroupId): JsonResponse
    {
        $user = $this->authenticatedTeacher();

        if ($user instanceof JsonResponse) {
            return $user;
        }

        $detail = $this->storage->getAuthenticatedTeacherSubjectDetail($user, $courseGroupId);

        if ($detail === false) {
            return response()->json([
                'success' => false,
                'message' => 'No tienes acceso a esta materia.',
            ], 403);
        }

        if ($detail === null) {
            return response()->json([
                'success' => false,
                'message' => 'Materia no encontrada.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $detail->toArray(),
            'message' => 'Detalle de materia obtenido exitosamente.',
        ], 200);
    }

    private function authenticatedTeacher(): User|JsonResponse
    {
        try {
            $user = JWTAuth::parseToken()->authenticate();
        } catch (Throwable) {
            return response()->json([
                'success' => false,
                'message' => 'No autenticado.',
            ], 401);
        }

        if (!$user || !$user->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'Usuario inactivo o no autenticado.',
            ], 401);
        }

        if ($user->role !== 'TEACHER') {
            return response()->json([
                'success' => false,
                'message' => 'No autorizado para consultar materias de docente.',
            ], 403);
        }

        return $user;
    }
}
