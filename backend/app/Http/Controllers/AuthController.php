<?php

namespace App\Http\Controllers;

use App\Exceptions\InvalidCredentialsException;
use App\Http\Requests\LoginRequest;
use App\Modules\CoreDataStorage;
use Illuminate\Http\JsonResponse;

class AuthController extends Controller
{
    public function __construct(
        private readonly CoreDataStorage $coreDataStorage
    ) {}

    /**
     * Authenticates a user and generates a JWT access token.
     */
    public function login(LoginRequest $request): JsonResponse
    {
        try {
            $session = $this->coreDataStorage->authenticate(
                $request->input('email'),
                $request->input('password')
            );

            return response()->json([
                'success' => true,
                'message' => 'Inicio de sesión exitoso',
                'data' => $session->toArray(),
            ], 200);

        } catch (InvalidCredentialsException $exception) {
            return response()->json([
                'success' => false,
                'message' => $exception->getMessage(),
            ], 401);
        }
    }
}
