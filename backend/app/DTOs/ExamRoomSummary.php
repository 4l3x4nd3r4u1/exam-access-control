<?php

namespace App\DTOs;

class ExamRoomSummary
{
    public function __construct(
        public readonly string $roomId,
        public readonly string $roomName,
        public readonly int $assignedCapacity,
        public readonly ?int $assistantId = null,
    ) {}

    public function toArray(): array
    {
        return [
            'room_id' => $this->roomId,
            'room_name' => $this->roomName,
            'assigned_capacity' => $this->assignedCapacity,
            'assistant_id' => $this->assistantId,
        ];
    }
}
