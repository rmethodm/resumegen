<?php

namespace App\Http\Requests;

use App\Concerns\AbortsAsNotFound;
use App\Models\JobApplication;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreJobApplicationInterviewRequest extends FormRequest
{
    use AbortsAsNotFound;

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
            'scheduled_at' => ['nullable', 'date'],
            'type' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
