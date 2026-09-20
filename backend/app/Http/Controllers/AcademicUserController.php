<?php

namespace App\Http\Controllers;

use App\DTOs\UserRegistrationData;
use App\Http\Requests\RegisterAcademicUserRequest;
use App\Modules\CoreDataStorage;
use Illuminate\Http\JsonResponse;
//Recibe HTTP convierte a DTO el metodo UserRegistrationData y 
// envia a la clase CoreDataStorage::registerAcademicUser() <- metodo de la clase para que 
// retorne JSON
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
}