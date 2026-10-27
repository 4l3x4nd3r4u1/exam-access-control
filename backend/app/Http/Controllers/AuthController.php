<?php

namespace App\Http\Controllers;

use App\Exceptions\InvalidCredentialsException;
use App\Http\Requests\LoginRequest;
use App\Modules\CoreDataStorage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;

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

    /**
     * Return details and permissions of the currently authenticated user.
     */
    public function me(Request $request): JsonResponse
    {
        try {
            $user = JWTAuth::setRequest($request)->parseToken()->authenticate();
            if (!$user) {
                return response()->json(['success' => false, 'message' => 'Usuario no encontrado'], 404);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'user_id' => $user->id,
                    'name' => $user->nombre,
                    'email' => $user->email,
                    'ci' => $user->ci,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Token no válido: ' . $e->getMessage()], 401);
        }
    }

    /**
     * Logout and invalidate the session and JWT token.
     */
    public function logout(Request $request): JsonResponse
    {
        try {
            $user = JWTAuth::setRequest($request)->parseToken()->authenticate();
            if ($user) {
                // Deactivate user sessions in table 'sesion'
                \App\Models\UserSession::where('usuario_id', $user->id)
                    ->where('activo', true)
                    ->update(['activo' => false]);
            }
            JWTAuth::setRequest($request)->invalidate(JWTAuth::setRequest($request)->getToken());

            return response()->json([
                'success' => true,
                'message' => 'Sesión cerrada exitosamente',
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Error al cerrar sesión: ' . $e->getMessage()], 400);
        }
    }
}
