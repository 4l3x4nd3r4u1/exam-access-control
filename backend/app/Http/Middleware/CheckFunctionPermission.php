<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;
use Symfony\Component\HttpFoundation\Response;

class CheckFunctionPermission
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @param  string  ...$functions
     */
    public function handle(Request $request, Closure $next, string ...$functions): Response
    {
        try {
            $user = JWTAuth::setRequest($request)->parseToken()->authenticate();
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Token de autenticación no proporcionado o inválido',
            ], Response::HTTP_UNAUTHORIZED);
        }

        if (!$user || !$user->activo) {
            return response()->json([
                'success' => false,
                'message' => 'Usuario inactivo o no autorizado',
            ], Response::HTTP_UNAUTHORIZED);
        }

        // Check if user has at least one of the required functions
        foreach ($functions as $function) {
            if ($user->hasFunction(trim($function))) {
                return $next($request);
            }
        }

        return response()->json([
            'success' => false,
            'message' => 'Acceso denegado: no cuenta con los permisos necesarios para esta acción',
            'required_functions' => $functions,
        ], Response::HTTP_FORBIDDEN);
    }
}
