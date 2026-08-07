<?php

namespace App\Http\Requests;

use App\Concerns\AbortsAsNotFound;
use App\Models\JobApplication;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateJobApplicationRequest extends FormRequest
{
    use AbortsAsNotFound;

    private const STATUSES = ['saved', 'applied', 'interviewing', 'offer', 'rejected'];

    /**
     * ponytail: ownership is a single user_id comparison, so it lives here
     * rather than in a policy class. Matches UpdateResumeRequest.
     */
    public function authorize(): bool
    {
        $jobApplication = $this->route('jobApplication');

        return $jobApplication instanceof JobApplication
            && $jobApplication->user_id === $this->user()?->id;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'company' => ['sometimes', 'string', 'max:255'],
            'role' => ['sometimes', 'string', 'max:255'],
            'resume_id' => ['nullable', 'integer', Rule::exists('resumes', 'id')->where('user_id', $this->user()?->id)],
            'job_url' => ['nullable', 'string', 'max:500'],
            'status' => ['sometimes', 'string', Rule::in(self::STATUSES)],
            'applied_at' => ['nullable', 'date'],
            'follow_up_at' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
