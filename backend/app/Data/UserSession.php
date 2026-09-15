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
            'user_id' => $this->userId,
            'role_id' => $this->roleId,
            'name' => $this->name,
            'email' => $this->email,
            'token' => $this->token,
        ];
    }
}