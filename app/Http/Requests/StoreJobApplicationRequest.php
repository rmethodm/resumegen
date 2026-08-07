<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreJobApplicationRequest extends FormRequest
{
    private const STATUSES = ['saved', 'applied', 'interviewing', 'offer', 'rejected'];

    /**
     * Any authenticated user may create their own new job application — there
     * is no existing record to own yet, so there is nothing to check against.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'company' => ['required', 'string', 'max:255'],
            'role' => ['required', 'string', 'max:255'],
            'resume_id' => ['nullable', 'integer', Rule::exists('resumes', 'id')->where('user_id', $this->user()?->id)],
            'job_url' => ['nullable', 'string', 'max:500'],
            'status' => ['sometimes', 'string', Rule::in(self::STATUSES)],
            'applied_at' => ['nullable', 'date'],
            'follow_up_at' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
