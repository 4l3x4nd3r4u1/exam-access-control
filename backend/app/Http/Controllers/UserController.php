<?php

    namespace App\Http\Controllers;

    use App\DTOs\UserUpdateData;
    use App\Enums\Role;
    use App\Services\CoreDataStorage;
    use App\Http\Requests\UpdateUserRequest;
    use Illuminate\Http\JsonResponse;

    class UserController extends Controller
    {
        public function __construct(
            private readonly CoreDataStorage $coreDataStorage,
        ) {}

        public function update(
            UpdateUserRequest $request,
            int $userId
        ): JsonResponse {
            $data = new UserUpdateData(
                fullName: $request->string('fullName')->toString(),
                email: $request->string('email')->toString(),
                role: Role::from($request->string('role')->toString()),
                newPassword: $request->input('newPassword'),
            );

            $result = $this->coreDataStorage->updateAcademicUser(
                $userId,
                $data
            );

            return response()->json([
                'isSuccessful' => $result->isSuccessful,
                'message' => $result->message,
                'timestamp' => $result->timestamp->format(DATE_ATOM),
            ], $result->isSuccessful ? 200 : 400);
        }
    }