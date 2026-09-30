<?php

namespace App\DTOs;

class UserRegistrationData
{
    /**
     * @param list<string> $roles
     */
    public function __construct(
        public string $fullName,
        public string $email,
        public string $password,
        public array $roles,
        public ?string $ci = null,
    ) {}
}
