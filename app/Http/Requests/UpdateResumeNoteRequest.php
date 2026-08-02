<?php

namespace App\Http\Requests;

use App\Concerns\AbortsAsNotFound;
use App\Models\ResumeNote;
use Illuminate\Foundation\Http\FormRequest;

class UpdateResumeNoteRequest extends FormRequest
{
    use AbortsAsNotFound;

    /**
     * The note reaches its owner through its resume. Foreign or missing 404s.
     */
    public function authorize(): bool
    {
        $note = $this->route('resumeNote');

        return $note instanceof ResumeNote
            && $note->resume->user_id === $this->user()?->id;
    }

    /**
     * Every field is `sometimes`: a drag PATCHes only x/y, a body edit PATCHes
     * only body.
     *
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            // `nullable`: clearing the textarea sends '' which the empty-string
            // middleware turns to null. The controller coerces null back to ''.
            'body' => ['sometimes', 'nullable', 'string'],
            'x' => ['sometimes', 'integer'],
            'y' => ['sometimes', 'integer'],
            'width' => ['sometimes', 'integer', 'min:160', 'max:800'],
            'height' => ['sometimes', 'integer', 'min:100', 'max:800'],
        ];
    }
}
