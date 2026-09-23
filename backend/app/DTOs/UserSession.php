<?php

namespace App\DTOs;

class UserSession
{
    public function __construct(
        public readonly int $userId,
        public readonly string $role,
        public readonly string $fullName,
        public readonly string $email,
        public readonly string $token,
        public readonly bool $isActive = true,
        public readonly string $tokenType = 'bearer',
        public readonly int $expiresIn = 21600,
    ) {}

    public function toArray(): array
    {
        return [
            'user_id' => $this->userId,
            'role' => $this->role,
            'full_name' => $this->fullName,
            'email' => $this->email,
            'token' => $this->token,
            'is_active' => $this->isActive,
            'token_type' => $this->tokenType,
            'expires_in' => $this->expiresIn,
        ];
    }
}
