<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RewriteSectionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'section' => ['required', 'string', 'in:summary'],
            'text' => ['required', 'string', 'max:2000'],
            'detail' => ['required', 'string', 'max:1000'],
        ];
    }
}
