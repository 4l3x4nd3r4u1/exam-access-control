<?php

namespace App\DTOs;

class ImportedPlanDetail
{
    /**
     * @param array<ImportedPlanStudent> $students
     */
    public function __construct(
        public readonly ImportedPlanSummary $plan,
        public readonly array $students,
    ) {}

    public function toArray(): array
    {
        return [
            'plan' => $this->plan->toArray(),
            'students' => array_map(fn(ImportedPlanStudent $student) => $student->toArray(), $this->students),
        ];
    }
}
