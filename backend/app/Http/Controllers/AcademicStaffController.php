<?php

namespace App\Http\Controllers;

use App\DTOs\UserSummary;
use App\Modules\CoreDataStorage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

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
     * Endpoint to register a new academic staff member (HU-02).
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'email' => [
                'required',
                'email',
                'unique:users,email',
                'regex:/@(fcyt\.umss\.edu\.bo|umss\.edu\.bo)$/i',
            ],
            'password' => ['required', 'string', 'min:6'],
            'role' => ['required', 'string', Rule::in(['TEACHER', 'ADMIN'])],
        ], [
            'email.regex' => 'El correo debe pertenecer al dominio institucional (@fcyt.umss.edu.bo o @umss.edu.bo).',
            'email.unique' => 'El correo electrónico ya se encuentra registrado.',
            'password.min' => 'La contraseña debe tener al menos 6 caracteres.',
            'role.in' => 'El rol seleccionado no es válido.',
        ]);

        $user = $this->storage->registerAcademicStaff(
            name: $validated['name'],
            email: $validated['email'],
            password: $validated['password'],
            role: $validated['role']
        );

        return response()->json([
            'success' => true,
            'data' => $user->toArray(),
            'message' => 'Personal académico registrado exitosamente.',
        ], 201);
    }
}
