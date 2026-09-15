<?php

namespace App\Http\Requests\Settings;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateStarterProfileRequest extends FormRequest
{
    /**
     * Drop blank skill/experience rows before validation.
     *
     * The intake UI lets users click "Add skill" / "Add role" and Save without
     * filling the row. Those empty rows used to fail `skills.*.name` required
     * and silently block the whole profile write (no skill error was shown).
     */
    protected function prepareForValidation(): void
    {
        if ($this->exists('skills')) {
            $skills = collect($this->input('skills', []))
                ->filter(fn (mixed $skill): bool => filled(data_get($skill, 'name')))
                ->map(fn (mixed $skill): array => [
                    'category' => (string) (data_get($skill, 'category') ?? ''),
                    'name' => (string) data_get($skill, 'name'),
                ])
                ->values()
                ->all();

            $this->merge(['skills' => $skills]);
        }

        if ($this->exists('experience_snapshot')) {
            $experiences = collect($this->input('experience_snapshot', []))
                ->map(function (mixed $experience): array {
                    $bullets = collect(data_get($experience, 'bullets', []))
                        ->filter(fn (mixed $bullet): bool => filled($bullet))
                        ->map(fn (mixed $bullet): string => (string) $bullet)
                        ->values()
                        ->all();

                    return [
                        'title' => (string) (data_get($experience, 'title') ?? ''),
                        'company' => (string) (data_get($experience, 'company') ?? ''),
                        'start_date' => (string) (data_get($experience, 'start_date') ?? ''),
                        'end_date' => (string) (data_get($experience, 'end_date') ?? ''),
                        'is_current' => filter_var(
                            data_get($experience, 'is_current', false),
                            FILTER_VALIDATE_BOOLEAN,
                        ),
                        'bullets' => $bullets,
                    ];
                })
                ->filter(fn (array $experience): bool => filled($experience['title'])
                    || filled($experience['company'])
                    || filled($experience['start_date'])
                    || filled($experience['end_date'])
                    || $experience['bullets'] !== [])
                ->values()
                ->all();

            $this->merge(['experience_snapshot' => $experiences]);
        }
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * The rules mirror UpdateResumeRequest so the starter profile cannot store
     * anything a resume would reject: the same US-phone shape, and http(s)-only
     * links to keep a `javascript:`/`data:` URL out of an href. Every field is
     * nullable — a blank profile is legitimate.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'full_name' => ['nullable', 'string', 'max:255'],
            'headline' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            // US only, in the one shape formatPhone() produces — matches
            // UpdateResumeRequest and resources/js/lib/contact-validation.ts.
            'phone' => ['nullable', 'string', 'regex:/^\(\d{3}\) \d{3}-\d{4}$/'],
            'location' => ['nullable', 'string', 'max:255'],
            'target_role' => ['nullable', 'string', 'max:255'],
            // http(s) only: these render into an href, so a bare `url` rule
            // (which accepts javascript:/data:) would be stored XSS.
            'linkedin' => ['nullable', 'string', 'max:255', 'url:http,https'],
            'website' => ['nullable', 'string', 'max:255', 'url:http,https'],

            'experience_snapshot' => ['nullable', 'array', 'max:20'],
            'experience_snapshot.*.title' => ['nullable', 'string', 'max:255'],
            'experience_snapshot.*.company' => ['nullable', 'string', 'max:255'],
            'experience_snapshot.*.start_date' => ['nullable', 'string', 'max:60'],
            'experience_snapshot.*.end_date' => ['nullable', 'string', 'max:60'],
            'experience_snapshot.*.is_current' => ['boolean'],
            'experience_snapshot.*.bullets' => ['array', 'max:12'],
            'experience_snapshot.*.bullets.*' => ['nullable', 'string', 'max:500'],

            'skills' => ['nullable', 'array', 'max:60'],
            'skills.*.category' => ['nullable', 'string', 'max:60'],
            'skills.*.name' => ['required', 'string', 'max:60'],
        ];
    }
}
