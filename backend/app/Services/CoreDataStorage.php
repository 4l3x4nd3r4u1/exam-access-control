<?php

namespace App\Services;

use App\Data\UserSession;
use App\Exceptions\InvalidCredentialsException;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class CoreDataStorage
{
    // $param $email user email
    // $param $password user password
    //Debuelve el opjeto de UserSession.php
    public function authenticate(
        string $email,
        string $password
    ): UserSession {

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

        $token = JWTAuth::fromUser($user);

        return new UserSession(
            userId: $user->id_usuario,
            roleId: $user->id_rol,
            fullName: $user->nombre_completo,
            email: $user->correo_electronico,
            token: $token,
            tokenType: 'bearer',
            expiresIn: 21600,
        );
    }
}