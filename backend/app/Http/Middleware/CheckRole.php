<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @param  string  ...$roles
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
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

        foreach ($roles as $role) {
            if ($user->hasRole(trim($role))) {
                return $next($request);
            }
        }

        return response()->json([
            'success' => false,
            'message' => 'Acceso denegado: rol no autorizado',
            'required_roles' => $roles,
        ], Response::HTTP_FORBIDDEN);
    }
}
