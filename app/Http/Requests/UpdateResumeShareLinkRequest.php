<?php

namespace App\Http\Requests;

use App\Concerns\AbortsAsNotFound;
use App\Models\ResumeShareLink;
use Illuminate\Foundation\Http\FormRequest;

class UpdateResumeShareLinkRequest extends FormRequest
{
    use AbortsAsNotFound;

    /**
     * The link reaches its owner through its resume. Foreign or missing 404s.
     */
    public function authorize(): bool
    {
        $link = $this->route('resumeShareLink');

        return $link instanceof ResumeShareLink
            && $link->resume->user_id === $this->user()?->id;
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'allow_download' => ['sometimes', 'boolean'],
            'require_email' => ['sometimes', 'boolean'],
            'require_password' => ['sometimes', 'boolean'],
            'password' => ['sometimes', 'nullable', 'string', 'max:8'],
            'expires_at' => ['sometimes', 'nullable', 'date'],
        ];
    }
}
