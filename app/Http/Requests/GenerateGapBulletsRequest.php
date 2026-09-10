<?php

namespace App\Http\Requests;

use App\Models\Resume;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class GenerateGapBulletsRequest extends FormRequest
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
        $resume = $this->route('resume');
        $resumeId = $resume instanceof Resume ? $resume->id : null;

        return [
            'keyword' => ['required', 'string', 'max:100'],
            'job_description' => ['required', 'string', 'max:10000'],
            'experience_id' => [
                'required_without:experience_index',
                'integer',
                Rule::exists('experiences', 'id')->where('resume_id', $resumeId),
            ],
            'experience_index' => [
                'required_without:experience_id',
                'integer',
                'min:0',
            ],
        ];
    }
}
