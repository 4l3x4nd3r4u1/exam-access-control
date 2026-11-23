<?php

namespace App\DTOs;

class ExamRoomData
{
    /**
     * @param list<int> $students
     */
    public function __construct(
        public readonly ?int $roomId,
        public readonly array $students,
        public readonly ?int $auxiliarId = null,
        public readonly ?int $assignedCapacity = null,
        public readonly ?string $customRoomName = null,
        public readonly ?int $customRoomCapacity = null,
    ) {}
}
