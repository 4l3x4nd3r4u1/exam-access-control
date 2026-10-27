<?php

namespace App\DTOs;

class UserSession
{
    public function __construct(
        public readonly string $token,
        public readonly bool $isActive = true,
        public readonly string $tokenType = 'bearer',
        public readonly int $expiresIn = 21600,
    ) {}

    public function toArray(): array
    {
        return [
            'token' => $this->token,
            'is_active' => $this->isActive,
            'token_type' => $this->tokenType,
            'expires_in' => $this->expiresIn,
        ];
    }
}
