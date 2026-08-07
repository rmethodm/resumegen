<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreImportedJobsRequest extends FormRequest
{
    /**
     * Any authenticated user may save jobs to their own list — there is no
     * existing record to own yet, so there is nothing to check against.
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
            'jobs' => ['required', 'array', 'min:1', 'max:20'],
            'jobs.*.source' => ['required', 'string', 'in:adzuna,usajobs,greenhouse,lever,career_page'],
            'jobs.*.external_id' => ['required', 'string', 'max:190'],
            'jobs.*.title' => ['required', 'string', 'max:255'],
            'jobs.*.company' => ['nullable', 'string', 'max:255'],
            'jobs.*.location' => ['nullable', 'string', 'max:255'],
            'jobs.*.url' => ['nullable', 'string', 'max:2048'],
            'jobs.*.salary' => ['nullable', 'string', 'max:100'],
            'jobs.*.description' => ['nullable', 'string'],
            'jobs.*.posted_at' => ['nullable', 'string', 'max:50'],
        ];
    }
}
