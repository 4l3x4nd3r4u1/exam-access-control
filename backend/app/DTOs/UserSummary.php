<?php

namespace App\DTOs;

class UserSummary
{
    public function __construct(
        public readonly int $userId,
        public readonly string $fullName,
        public readonly string $email,
        public readonly string $role,
        public readonly bool $isActive = true,
    ) {}

    public function toArray(): array
    {
        return [
            'user_id' => $this->userId,
            'full_name' => $this->fullName,
            'email' => $this->email,
            'role' => $this->role,
            'is_active' => $this->isActive,
        ];
    }
}
