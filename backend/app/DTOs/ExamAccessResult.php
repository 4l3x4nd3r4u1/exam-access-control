<?php

namespace App\DTOs;

class ExamAccessResult
{
    public function __construct(
        public readonly bool $isSuccessful,
        public readonly array $data,
        public readonly string $message,
        public readonly int $httpStatus = 200,
    ) {}

    public function toArray(): array
    {
        return [
            'success' => $this->isSuccessful,
            'data' => $this->data,
            'message' => $this->message,
        ];
    }
}
