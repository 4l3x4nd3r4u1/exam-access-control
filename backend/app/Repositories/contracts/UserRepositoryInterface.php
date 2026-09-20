<?php

    namespace App\Repositories\Contracts;

    use App\Models\User;

    interface UserRepositoryInterface
    {
        public function findById(int $userId): ?User;

        public function existsByEmailExceptUser(
            string $email,
            int $userId
        ): bool;

        public function save(User $user): User;
    }