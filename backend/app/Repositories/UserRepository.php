<?php
    namespace App\Repositories;

    use App\Repositories\Contracts\UserRepositoryInterface;
    use App\Models\User;

    class UserRepository implements UserRepositoryInterface
    {
        public function findById(int $userId): ?User
        {
            return User::find($userId);
        }

        public function existsByEmailExceptUser(
            string $email,
            int $userId
        ): bool {
            return User::query()
                ->where('email', $email)
                ->where('id', '!=', $userId)
                ->exists();
        }

        public function save(User $user): User
        {
            $user->save();

            return $user->refresh();
        }
    }