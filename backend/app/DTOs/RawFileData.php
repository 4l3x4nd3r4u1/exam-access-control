<?php

namespace App\DTOs;

class RawFileData
{
    /**
     * @param string $content Raw binary or text file content
     * @param string $fileName Original file name (e.g. 'Roster_2026.csv')
     * @param string $extension File extension (e.g. 'csv', 'xlsx')
     */
    public function __construct(
        public readonly string $content,
        public readonly string $fileName,
        public readonly string $extension
    ) {}
}
