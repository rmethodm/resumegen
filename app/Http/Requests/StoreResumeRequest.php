<?php

namespace App\Http\Requests;

use App\Support\ResumeDocument;
use App\Support\RoleSamples;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreResumeRequest extends FormRequest
{
    /**
     * Any authenticated user may create their own new resume — there is no
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
            'template' => ['nullable', Rule::in(ResumeDocument::TEMPLATES)],
            'font' => ['nullable', Rule::in(ResumeDocument::FONTS)],
            /** Role sample id from RoleSamples (e.g. software-engineer). */
            'sample' => ['nullable', 'string', Rule::in(RoleSamples::ids())],
            /** Pasted plain-text resume for heuristic import. */
            'plain_text' => ['nullable', 'string', 'max:50000'],
        ];
    }
}
