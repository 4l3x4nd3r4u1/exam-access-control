<?php

namespace App\Exceptions;

use RuntimeException;

class InvalidCredentialsException extends RuntimeException
{
    public function __construct(string $message = 'Credenciales incorrectas')
    {
        parent::__construct($message);
    }
}
