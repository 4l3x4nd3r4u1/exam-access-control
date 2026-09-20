<?php

    namespace App\DTOs;

    use App\Enums\Role;

    class UserUpdateData
    {
        public function __construct(
            public readonly string $fullName,
            public readonly string $email,
            public readonly Role $role,
            public readonly ?string $newPassword = null,
        ) {}
    }