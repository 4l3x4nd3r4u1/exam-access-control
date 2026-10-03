<?php

namespace App\DTOs;

class ProcessedRosterDetail
{
    /**
     * @param list<EnrolledStudentSummary> $students
     */
    public function __construct(
        public readonly ProcessedRosterSummary $metadata,
        public readonly array $students,
    ) {}

    public function toArray(): array
    {
        return [
            'metadata' => $this->metadata->toArray(),
            'students' => array_map(fn(EnrolledStudentSummary $s) => $s->toArray(), $this->students),
        ];
    }
}
