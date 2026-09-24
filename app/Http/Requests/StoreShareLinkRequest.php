<?php

namespace App\Http\Requests;

use App\Concerns\AbortsAsNotFound;
use App\Models\Resume;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Create action on the /shares index (legacy builder/{resume}/share URL).
 */
class StoreShareLinkRequest extends FormRequest
{
    use AbortsAsNotFound;

    public function authorize(): bool
    {
        $resume = $this->route('resume');

        return $resume instanceof Resume
            && $resume->user_id === $this->user()?->id;
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            // Accepted for UI compatibility but not stored.
            'label' => ['nullable', 'string', 'max:100'],
        ];
    }
}
