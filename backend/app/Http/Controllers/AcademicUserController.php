<?php

namespace App\Http\Controllers;

use App\DTOs\UserPersonalData;
use App\DTOs\UserRegistrationData;
use App\DTOs\UserRolesData;
use App\Http\Requests\RegisterAcademicUserRequest;
use App\Http\Requests\UpdatePersonalDataRequest;
use App\Http\Requests\UpdateUserRolesRequest;
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
            roles: $request->input('roles', []),
            ci: $request->input('ci')
        );

        $result = $this->coreDataStorage->registerAcademicUser($data);

        return response()->json([
            'success' => $result->isSuccessful,
            'message' => $result->message,
            'timestamp' => $result->timestamp,
        ], $result->isSuccessful ? 201 : 400);
    }

    /**
     * Updates personal data of the authenticated user.
     */
    public function updatePersonalData(UpdatePersonalDataRequest $request): JsonResponse
    {
        $data = new UserPersonalData(
            fullName: $request->input('fullName'),
            ci: $request->input('ci'),
            newPassword: $request->input('newPassword')
        );

        $result = $this->coreDataStorage->updatePersonalData($data);

        return response()->json([
            'success' => $result->isSuccessful,
            'message' => $result->message,
            'timestamp' => $result->timestamp,
        ], $result->isSuccessful ? 200 : 400);
    }

    /**
     * Updates roles of a specific user. Only for admin use.
     */
    public function updateUserRoles(UpdateUserRolesRequest $request): JsonResponse
    {
        $data = new UserRolesData(
            roles: $request->input('roles', [])
        );

        $result = $this->coreDataStorage->updateUserRoles(
            (int) $request->input('userId'),
            $data
        );

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
