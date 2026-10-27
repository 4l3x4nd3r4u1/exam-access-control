<?php

namespace App\DTOs;

class UserPersonalData
{
    public function __construct(
        public readonly string $fullName,
        public readonly ?string $ci = null,
        public readonly ?string $newPassword = null,
    ) {}
}
