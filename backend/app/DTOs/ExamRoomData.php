<?php

namespace App\DTOs;

class ExamRoomData
{
    /**
     * @param list<int> $students
     */
    public function __construct(
        public readonly int $roomId,
        public readonly array $students,
    ) {}
}
