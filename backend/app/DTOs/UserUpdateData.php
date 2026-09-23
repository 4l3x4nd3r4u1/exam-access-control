<?php

namespace App\DTOs;

class UserUpdateData
{
    public function __construct(
        public readonly string $fullName,
        public readonly string $email,
        public readonly string $role,
        public readonly ?string $newPassword = null,
    ) {}
}
