<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RewriteBulletRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'bullet' => ['required', 'string', 'max:500'],
            'target_role' => ['nullable', 'string', 'max:150'],
        ];
    }
}
