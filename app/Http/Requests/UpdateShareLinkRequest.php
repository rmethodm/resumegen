<?php

namespace App\Http\Requests;

use App\Concerns\AbortsAsNotFound;
use App\Models\Resume;
use App\Models\ResumeShareLink;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Edit action on the /shares index (legacy builder/{resume}/share/{link}
 * URL). The link must belong to the resume in the URL, and both to the
 * acting user; anything else 404s. Password limits match
 * UpdateResumeShareLinkRequest (bcrypt only reads 72 bytes).
 */
class UpdateShareLinkRequest extends FormRequest
{
    use AbortsAsNotFound;

    public function authorize(): bool
    {
        $resume = $this->route('resume');
        $link = $this->route('link');

        return $resume instanceof Resume
            && $link instanceof ResumeShareLink
            && $resume->user_id === $this->user()?->id
            && $link->resume_id === $resume->id;
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'expires_at' => ['sometimes', 'nullable', 'date'],
            'resume_id' => ['sometimes', 'integer', 'exists:resumes,id'],
            'password' => ['sometimes', 'nullable', 'string', 'min:8', 'max:72'],
            'require_password' => ['sometimes', 'boolean'],
            'allow_download' => ['sometimes', 'boolean'],
            'require_email' => ['sometimes', 'boolean'],
            // Accepted no-ops for the Shares UI still posting them:
            'label' => ['sometimes', 'nullable', 'string', 'max:100'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
