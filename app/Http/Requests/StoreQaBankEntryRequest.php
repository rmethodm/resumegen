<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreQaBankEntryRequest extends FormRequest
{
    /**
     * Any authenticated user may add an entry to their own Q&A bank — the
     * starter profile it belongs to is created on demand if missing.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'question' => ['required', 'string', 'max:2000'],
            'answer' => ['nullable', 'string', 'max:5000'],
        ];
    }
}
