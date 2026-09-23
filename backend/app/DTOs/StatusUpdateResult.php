<?php

namespace App\DTOs;

use DateTimeImmutable;

class StatusUpdateResult
{
    public function __construct(
        public readonly bool $isSuccessful,
        public readonly string $message,
        public readonly DateTimeImmutable $timestamp = new DateTimeImmutable()
    ) {}
}
