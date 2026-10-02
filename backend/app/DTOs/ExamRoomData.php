<?php

namespace App\DTOs;

class ExamRoomData
{
    public function __construct(
        public readonly int $roomId,
        public readonly int $capacity,
    ) {}
}
