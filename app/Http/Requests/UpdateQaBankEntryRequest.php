<?php

namespace App\Http\Requests;

use App\Concerns\AbortsAsNotFound;
use App\Models\QaBankEntry;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateQaBankEntryRequest extends FormRequest
{
    use AbortsAsNotFound;

    public function authorize(): bool
    {
        $entry = $this->route('entry');

        return $entry instanceof QaBankEntry
            && $entry->starterProfile->user_id === $this->user()?->id;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'question' => ['sometimes', 'string', 'max:2000'],
            'answer' => ['nullable', 'string', 'max:5000'],
            'position' => ['sometimes', 'integer', 'min:0'],
        ];
    }
}
