<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Extension API Q&A bank lookup. Token ability is checked in
 * Api\ExtensionController; the match only reads the caller's own entries.
 */
class MatchQaBankQuestionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'question' => ['required', 'string', 'max:2000'],
        ];
    }
}
