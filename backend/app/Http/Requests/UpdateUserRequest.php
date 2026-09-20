<?php

    namespace App\Http\Requests;

    use Illuminate\Foundation\Http\FormRequest;
    use Illuminate\Validation\Rule;
    use App\Enums\Role;

    class UpdateUserRequest extends FormRequest
    {
        public function authorize(): bool
        {
            return true;
        }

        public function rules(): array
        {
            return [
                'fullName' => [
                    'required',
                    'string',
                    'max:255',
                ],

                'email' => [
                    'required',
                    'email',
                    'max:255',
                ],

                'role' => [
                    'required',
                    Rule::enum(Role::class),
                ],

                'newPassword' => [
                    'nullable',
                    'string',
                    'min:8',
                ],
            ];
        }
    }