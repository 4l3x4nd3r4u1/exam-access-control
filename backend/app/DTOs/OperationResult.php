<?php

namespace App\DTOs;

use DateTimeImmutable;

class OperationResult
{
    public function __construct(
        public bool $esExitoso,
        public string $mensaje,
        public DateTimeImmutable $timestamp = new DateTimeImmutable()
    ) {}
}