<?php

namespace App\Http\Requests;

use App\Concerns\AbortsAsNotFound;
use App\Models\Resume;
use Illuminate\Foundation\Http\FormRequest;

class UpdateResumeTitleRequest extends FormRequest
{
    use AbortsAsNotFound;

    /**
     * Was previously left to ResumeController::rename()'s own abort_unless —
     * correct today, but a backstop for the next controller that forgets
     * it, same as UpdateResumeSharingRequest.
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
            'title' => ['required', 'string', 'max:255'],
            'target_company' => ['nullable', 'string', 'max:255'],
        ];
    }
}
