<?php

namespace App\Data;

class UserSession
{
    public function __construct(
        public readonly int $userId,
        public readonly int $roleId,
        public readonly string $name,
        public readonly string $email,
        public readonly ?string $token = null,
    ) {
    }

    public function toArray(): array
    {
        return [
        'message' => 'Inicio de sesión exitoso',
        'data' => [
        'user_id' => 3,
        'role_id' => 2,
        'full_name' => 'Juan Perez',
        'email' => 'juan@umss.edu.bo',
        'token' => 'eyJ0eXAiOiJKV1QiLCJhbGciOi...',
        'token_type' => 'bearer',
        'expires_in' => 21600,
      ],
      ];
    }
}