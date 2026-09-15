<?php

namespace App\Services;

use App\Data\UserSession;
use App\Exceptions\InvalidCredentialsException;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class CoreDataStorage
{
    public function authenticate(string $email, string $password): UserSession
    {
        $user = User::where('correo_electronico', $email)->first();

        if (!$user) {
            throw new InvalidCredentialsException();
        }

        if (!Hash::check($password, $user->contrasenia)) {
            throw new InvalidCredentialsException();
        }

        if ($user->estado !== 'Activo') {
            throw new InvalidCredentialsException();
        }

        return new UserSession(
            userId: $user->id_usuario,
            roleId: $user->id_rol,
            name: $user->nombre_completo,
            email: $user->correo_electronico,
        );
    }
}