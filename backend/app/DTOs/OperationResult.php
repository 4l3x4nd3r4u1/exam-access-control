<?php

namespace App\DTOs;

use DateTimeImmutable;

//Se creo con la intencion de que represente
//el resultaod de una operacion del sistema 
//como se puedde ver en el constructor 

class OperationResult
{
    public function __construct(
        public bool $isSuccessful,
        public string $message,
        public DateTimeImmutable $timestamp = new DateTimeImmutable()
    ) {}
}