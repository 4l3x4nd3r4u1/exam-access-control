<?php

namespace App\DTOs;

class UserRegistrationData
{
    public function __construct(
        public string $fullName,
        public string $email,
        public string $password,
        public string $role,
        public ?string $ci = null,
    ) {}
}
