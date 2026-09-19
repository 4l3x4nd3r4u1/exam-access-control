<?php

namespace App\DTOs;
// Se creo el app/DTOs/UserRegistrationData.php para representar
// la informacion necesria para que se registre un nuevo usuario
//solo transporta informacion no valida nada
class UserRegistrationData
{
    public function __construct(
        public string $fullName,
        public string $email,
        public string $password,
        public string $role
    ) {}
}