<?php

namespace App\DTOs;

class RoomSummary
{
    public function __construct(
        public readonly string $roomId,
        public readonly string $roomName,
        public readonly int $capacity,
    ) {}

    public function toArray(): array
    {
        return [
            'room_id' => $this->roomId,
            'room_name' => $this->roomName,
            'capacity' => $this->capacity,
        ];
    }
}
