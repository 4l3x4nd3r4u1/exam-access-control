<?php

    namespace App\Services;

    use App\DTOs\OperationResult;
    use App\DTOs\UserUpdateData;
    use App\Repositories\Contracts\UserRepositoryInterface;
    use DateTimeImmutable;
    use Illuminate\Support\Facades\Hash;

    class CoreDataStorage
    {
        public function __construct(
            private readonly UserRepositoryInterface $userRepository,
        ) {}

        public function updateAcademicUser(
            int $userId,
            UserUpdateData $data
        ): OperationResult {
            $timestamp = new DateTimeImmutable();

            $user = $this->userRepository->findById($userId);

            if (!$user) {
                return new OperationResult(
                    isSuccessful: false,
                    message: 'El usuario no existe.',
                    timestamp: $timestamp,
                );
            }

            if (
                $user->email !== $data->email &&
                $this->userRepository->existsByEmailExceptUser(
                    $data->email,
                    $userId
                )
            ) {
                return new OperationResult(
                    isSuccessful: false,
                    message: 'El correo electrónico ya está registrado.',
                    timestamp: $timestamp,
                );
            }

            $user->full_name = $data->fullName;
            $user->email = $data->email;
            $user->role = $data->role->value;

            if ($data->newPassword !== null) {
                $user->password = Hash::make($data->newPassword);
            }

            $this->userRepository->save($user);

            return new OperationResult(
                isSuccessful: true,
                message: 'Los datos del usuario fueron actualizados correctamente.',
                timestamp: $timestamp,
            );
        }
    }