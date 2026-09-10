<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RewriteSummaryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'summary' => ['required', 'string', 'max:2000'],
            'target_role' => ['nullable', 'string', 'max:150'],
        ];
    }
}
