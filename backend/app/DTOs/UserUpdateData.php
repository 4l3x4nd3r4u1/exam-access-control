<?php

namespace App\DTOs;

class UserUpdateData
{
    /**
     * @param list<string> $roles
     */
    public function __construct(
        public readonly string $fullName,
        public readonly string $email,
        public readonly array $roles,
        public readonly ?string $newPassword = null,
        public readonly ?string $ci = null,
    ) {}
}
