<?php

namespace App\Http\Controllers;

use App\DTOs\UserRegistrationData;
use App\DTOs\UserUpdateData;
use App\Http\Requests\RegisterAcademicUserRequest;
use App\Http\Requests\UpdateAcademicUserRequest;
use App\Modules\CoreDataStorage;
use Illuminate\Http\JsonResponse;

class AcademicUserController extends Controller
{
    public function __construct(
        private readonly CoreDataStorage $coreDataStorage
    ) {}

    /**
     * Registers a new academic user.
     */
    public function store(RegisterAcademicUserRequest $request): JsonResponse
    {
        $data = new UserRegistrationData(
            fullName: $request->input('fullName'),
            email: $request->input('email'),
            password: $request->input('password'),
            role: $request->input('role')
        );

        $result = $this->coreDataStorage->registerAcademicUser($data);

        return response()->json([
            'success' => $result->isSuccessful,
            'message' => $result->message,
            'timestamp' => $result->timestamp,
        ], $result->isSuccessful ? 201 : 400);
    }

    /**
     * Updates an existing academic user.
     */
    public function update(UpdateAcademicUserRequest $request, int $userId): JsonResponse
    {
        $data = new UserUpdateData(
            fullName: $request->input('fullName'),
            email: $request->input('email'),
            role: $request->input('role'),
            newPassword: $request->input('newPassword')
        );

        $result = $this->coreDataStorage->updateAcademicUser($userId, $data);

        $statusCode = $result->isSuccessful
            ? 200
            : ($result->message === 'Usuario no encontrado' ? 404 : 400);

        return response()->json([
            'success' => $result->isSuccessful,
            'message' => $result->message,
            'timestamp' => $result->timestamp,
        ], $statusCode);
    }
}