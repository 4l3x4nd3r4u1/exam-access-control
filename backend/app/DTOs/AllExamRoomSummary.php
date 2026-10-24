<?php

namespace App\DTOs;

class AllExamRoomSummary
{
    public function __construct(
        public readonly string $roomId,
        public readonly string $roomName,
        public readonly ?int $assistantId,
        public readonly bool $canInteract,
    ) {}

    public function toArray(): array
    {
        return [
            'room_id' => $this->roomId,
            'room_name' => $this->roomName,
            'assistant_id' => $this->assistantId,
            'can_interact' => $this->canInteract,
        ];
    }
}
