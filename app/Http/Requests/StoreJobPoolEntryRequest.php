<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreJobPoolEntryRequest extends FormRequest
{
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
            'job_listing_id' => [
                'required',
                'integer',
                Rule::exists('job_listings', 'id'),
                Rule::unique('job_pool_entries')->where('user_id', $this->user()?->id),
            ],
            'resume_id' => [
                'required',
                'integer',
                Rule::exists('resumes', 'id')->where('user_id', $this->user()?->id),
            ],
        ];
    }
}
