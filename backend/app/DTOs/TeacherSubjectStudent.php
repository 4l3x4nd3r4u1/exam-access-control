<?php

namespace App\DTOs;

class TeacherSubjectStudent
{
    public function __construct(
        public readonly string $sis,
        public readonly string $ci,
        public readonly string $fullName,
    ) {}

    public function toArray(): array
    {
        return [
            'sis' => $this->sis,
            'ci' => $this->ci,
            'full_name' => $this->fullName,
        ];
    }
}
