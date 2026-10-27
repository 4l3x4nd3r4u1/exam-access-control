<?php

namespace App\DTOs;

class UserSummary
{
    /**
     * @param list<string> $roles
     */
    public function __construct(
        public readonly int $userId,
        public readonly string $fullName,
        public readonly string $email,
        public readonly array $roles,
        public readonly bool $isActive = true,
    ) {}

    public function toArray(): array
    {
        return [
            'user_id' => $this->userId,
            'full_name' => $this->fullName,
            'email' => $this->email,
            'roles' => $this->roles,
            'is_active' => $this->isActive,
        ];
    }
}
