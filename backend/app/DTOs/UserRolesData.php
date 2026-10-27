<?php

namespace App\DTOs;

class UserRolesData
{
    /**
     * @param list<string> $roles
     */
    public function __construct(
        public readonly array $roles,
    ) {}
}
