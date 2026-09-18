<?php

namespace App\DTOs;

class UserRegistrationData
{
    public function __construct(
        public string $nombreCompleto,
        public string $email,
        public string $passwordProvisional,
        public string $rol
    ) {}
}