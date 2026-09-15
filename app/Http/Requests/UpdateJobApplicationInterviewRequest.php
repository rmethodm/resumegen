<?php

namespace App\Http\Requests;

use App\Concerns\AbortsAsNotFound;
use App\Models\JobApplication;
use App\Models\JobApplicationInterview;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateJobApplicationInterviewRequest extends FormRequest
{
    use AbortsAsNotFound;

    public function authorize(): bool
    {
        $jobApplication = $this->route('jobApplication');
        $interview = $this->route('interview');

        return $jobApplication instanceof JobApplication
            && $jobApplication->user_id === $this->user()?->id
            && $interview instanceof JobApplicationInterview
            && $interview->job_application_id === $jobApplication->id;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'scheduled_at' => ['nullable', 'date'],
            'type' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
