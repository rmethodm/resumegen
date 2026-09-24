<?php

namespace App\Http\Requests;

use App\Concerns\AbortsAsNotFound;
use App\Models\Resume;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Extension right-click JD import. Token ability is checked in
 * Api\ExtensionController; ownership 404s here.
 */
class UpdateResumeTargetJobDescriptionRequest extends FormRequest
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
            'target_job_description' => ['nullable', 'string', 'max:10000'],
        ];
    }
}
