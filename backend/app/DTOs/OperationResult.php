<?php

    namespace App\DTOs;

    use DateTimeImmutable;

    class OperationResult
    {
        public function __construct(
            public readonly bool $isSuccessful,
            public readonly string $message,
            public readonly DateTimeImmutable $timestamp,
        ) {}
    }