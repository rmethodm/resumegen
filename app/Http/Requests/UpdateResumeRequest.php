<?php

namespace App\Http\Requests;

use App\Concerns\AbortsAsNotFound;
use App\Models\Resume;
use App\Support\ResumeDocument;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateResumeRequest extends FormRequest
{
    use AbortsAsNotFound;

    /**
     * ponytail: ownership is a single owner_id comparison, so it lives here
     * rather than in a policy class. Move it to one if resumes ever gain
     * sharing or collaborator roles.
     */
    public function authorize(): bool
    {
        $resume = $this->route('resume');

        return $resume instanceof Resume
            && $resume->user_id === $this->user()?->id;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'target_role' => ['nullable', 'string', 'max:255'],
            'target_company' => ['nullable', 'string', 'max:255'],
            'target_job_description' => ['nullable', 'string', 'max:10000'],

            'full_name' => ['nullable', 'string', 'max:255'],
            'headline' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            // US only, in the one shape formatPhone() produces in
            // resources/js/lib/contact-validation.ts. Keep the two in step.
            'phone' => ['nullable', 'string', 'regex:/^\(\d{3}\) \d{3}-\d{4}$/'],
            'location' => ['nullable', 'string', 'max:255'],
            'linkedin' => ['nullable', 'string', 'max:255'],
            'website' => ['nullable', 'string', 'max:255'],
            'summary' => ['nullable', 'string', 'max:2000'],

            // Presentation. Constrained to the sets the preview can render, so
            // an unknown value can't silently produce an unstyled document.
            'template' => ['nullable', Rule::in(ResumeDocument::TEMPLATES)],
            'font' => ['nullable', Rule::in(ResumeDocument::FONTS)],
            'density' => ['nullable', Rule::in(['compact', 'balanced', 'spacious'])],
            'skills_layout' => ['nullable', Rule::in(['inline', 'bullets', 'grouped', 'columns', 'narrative'])],
            'bullet_style' => ['nullable', Rule::in(['bullet', 'numbered', 'indented'])],
            'section_order' => ['nullable', 'array', 'max:20'],
            'section_order.*' => [Rule::in(Resume::SECTIONS)],

            'experiences' => ['array', 'max:20'],
            'experiences.*.title' => ['nullable', 'string', 'max:255'],
            'experiences.*.company' => ['nullable', 'string', 'max:255'],
            'experiences.*.start_date' => ['nullable', 'string', 'max:60'],
            'experiences.*.end_date' => ['nullable', 'string', 'max:60'],
            'experiences.*.is_current' => ['boolean'],
            'experiences.*.bullets' => ['array', 'max:12'],
            // Nullable, not string: a bullet the user emptied arrives as null
            // once TrimStrings and ConvertEmptyStringsToNull have run.
            'experiences.*.bullets.*' => ['nullable', 'string', 'max:500'],

            'projects' => ['array', 'max:20'],
            'projects.*.name' => ['nullable', 'string', 'max:255'],
            'projects.*.url' => ['nullable', 'string', 'max:255'],
            'projects.*.start_date' => ['nullable', 'string', 'max:60'],
            'projects.*.end_date' => ['nullable', 'string', 'max:60'],
            'projects.*.description' => ['nullable', 'string', 'max:2000'],
            'projects.*.highlights' => ['array', 'max:12'],
            'projects.*.highlights.*' => ['nullable', 'string', 'max:500'],

            'education' => ['array', 'max:20'],
            'education.*.school' => ['nullable', 'string', 'max:255'],
            'education.*.degree' => ['nullable', 'string', 'max:255'],
            'education.*.field' => ['nullable', 'string', 'max:255'],
            'education.*.graduation_year' => ['nullable', 'string', 'max:20'],

            'certificates' => ['array', 'max:20'],
            'certificates.*.name' => ['nullable', 'string', 'max:255'],
            'certificates.*.issuer' => ['nullable', 'string', 'max:255'],
            'certificates.*.obtained_at' => ['nullable', 'string', 'max:60'],
            'certificates.*.expires_at' => ['nullable', 'string', 'max:60'],
            'certificates.*.credential_id' => ['nullable', 'string', 'max:120'],

            'skills' => ['array', 'max:60'],
            'skills.*.category' => ['nullable', 'string', 'max:60'],
            'skills.*.name' => ['required', 'string', 'max:60'],
        ];
    }

    /**
     * Cleared inputs reach here as null rather than '', so every element has to
     * be checked before it is trimmed.
     */
    protected function prepareForValidation(): void
    {
        $this->merge([
            'experiences' => $this->input('experiences', []),
            'projects' => $this->input('projects', []),
            'education' => $this->input('education', []),
            'certificates' => $this->input('certificates', []),
            'skills' => $this->cleanSkills(),
        ]);
    }

    /**
     * Trim skill names, drop the blanks, and collapse duplicates within a
     * category (the same name under two categories is deliberate).
     *
     * @return list<array{category: string, name: string}>
     */
    private function cleanSkills(): array
    {
        $seen = [];
        $skills = [];

        foreach ($this->input('skills', []) as $skill) {
            if (! is_array($skill) || ! is_string($skill['name'] ?? null)) {
                continue;
            }

            $name = trim($skill['name']);
            $category = trim((string) ($skill['category'] ?? ''));
            $key = mb_strtolower($category.'|'.$name);

            if ($name === '' || isset($seen[$key])) {
                continue;
            }

            $seen[$key] = true;
            $skills[] = ['category' => $category, 'name' => $name];
        }

        return $skills;
    }
}
