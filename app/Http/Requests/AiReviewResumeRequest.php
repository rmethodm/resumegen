<?php

namespace App\Http\Requests;

use App\Concerns\AbortsAsNotFound;
use App\Models\Resume;
use Illuminate\Foundation\Http\FormRequest;

class AiReviewResumeRequest extends FormRequest
{
    use AbortsAsNotFound;

    public function authorize(): bool
    {
        $resume = $this->route('resume');

        return $resume instanceof Resume
            && $resume->user_id === $this->user()?->id;
    }

    /**
     * @return array<string, string>
     */
    public function rules(): array
    {
        return [
            'preset' => 'required|string|in:general,tailor_jd,concise,leadership,quantify',
        ];
    }
}
