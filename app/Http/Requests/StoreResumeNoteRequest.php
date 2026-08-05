<?php

namespace App\Http\Requests;

use App\Concerns\AbortsAsNotFound;
use App\Models\Resume;
use Illuminate\Foundation\Http\FormRequest;

class StoreResumeNoteRequest extends FormRequest
{
    use AbortsAsNotFound;

    /**
     * Owner-only. A foreign or missing resume 404s rather than 403s, matching
     * the rest of the app — a 403 would confirm the resume exists.
     */
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
            // `present`, not `required`: a note is created empty and opened for
            // typing, so the body may be blank but the key must exist.
            // `nullable` because ConvertEmptyStringsToNull turns '' into null;
            // the controller coerces it back to '' for the non-null column.
            'body' => ['present', 'nullable', 'string', 'max:2000'],
            'x' => ['required', 'integer'],
            'y' => ['required', 'integer'],
            'width' => ['sometimes', 'integer', 'min:160', 'max:800'],
            'height' => ['sometimes', 'integer', 'min:100', 'max:800'],
        ];
    }
}
