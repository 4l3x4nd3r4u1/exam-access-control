<?php

namespace App\DTOs;

class ImportSummary
{
    /**
     * @param int $totalProcessed Total number of rows read from the file
     * @param int $successful Number of students/enrollments registered successfully
     * @param int $skipped Number of rows skipped due to errors or invalid data
     * @param array<string> $observations List of warnings or row-level error details
     * @param bool $isSuccessful Indicates whether the global operation succeeded
     * @param array<array{rowNumber: int, reason: string, data: array<string, string>}> $failedRows List of failed rows with original data
     * @param array<string, string>|null $metadata Course and teacher metadata extracted from file header
     */
    public function __construct(
        public readonly int $totalProcessed,
        public readonly int $successful,
        public readonly int $skipped,
        public readonly array $observations = [],
        public readonly bool $isSuccessful = true,
        public readonly array $failedRows = [],
        public readonly ?array $metadata = null
    ) {}
}
