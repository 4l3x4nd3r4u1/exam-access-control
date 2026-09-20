<?php

namespace App\DTOs;

class ProcessedRosterSummary
{
    public function __construct(
        public readonly string $courseGroupId,
        public readonly string $subjectCode,
        public readonly string $subjectName,
        public readonly string $groupCode,
        public readonly string $academicTerm,
        public readonly int $totalStudents,
    ) {
    }
}