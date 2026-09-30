<?php

namespace App\DTOs;

class ScheduleExamData
{
    /**
     * @param string $title
     * @param string $date
     * @param string $startTime
     * @param string $endTime
     * @param array<string> $classrooms
     * @param array<string> $rules
     */
    public function __construct(
        public readonly string $title,
        public readonly string $date,
        public readonly string $startTime,
        public readonly string $endTime,
        public readonly array $classrooms = [],
        public readonly array $rules = []
    ) {}
}
