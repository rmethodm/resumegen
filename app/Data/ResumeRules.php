<?php

namespace App\Data;

class ResumeRules
{
    public static function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'template' => ['sometimes', 'required', 'in:classic,modern,minimal,minimal-ruled,executive,ats,skills-first,academic,bold'],
            'accent_color' => ['sometimes', 'nullable', 'in:#4f46e5,#1e3a5f,#475569,#166534,#7f1d1d,#1f2937,#0f766e,#78716c'],
            'font_family' => ['sometimes', 'nullable', 'in:sans,serif,mono'],
            'summary' => ['nullable', 'string'],
            'target_job_description' => ['nullable', 'string', 'max:10000'],
            'contact' => ['nullable', 'array'],
            'experience' => ['nullable', 'array'],
            'education' => ['nullable', 'array'],
            'projects' => ['nullable', 'array'],
            'projects.*.id' => ['nullable', 'string'],
            'projects.*.name' => ['nullable', 'string', 'max:200'],
            'projects.*.description' => ['nullable', 'string', 'max:2000'],
            'projects.*.url' => ['nullable', 'string', 'max:500'],
            'projects.*.start_date' => ['nullable', 'string', 'max:50'],
            'projects.*.end_date' => ['nullable', 'string', 'max:50'],
            'projects.*.bullets' => ['nullable', 'string'],
            'skills' => ['nullable', 'array'],
            'skills_layout' => ['sometimes', 'nullable', 'in:inline,bullets,grouped-vertical,grouped-inline,narrative'],
            'skills_groups' => ['nullable', 'array'],
            'skills_groups.*.id' => ['nullable', 'string'],
            'skills_groups.*.category_type' => ['nullable', 'string', 'max:100'],
            'skills_groups.*.category' => ['required_with:skills_groups', 'string', 'max:100'],
            'skills_groups.*.items' => ['required_with:skills_groups', 'array'],
            'skills_groups.*.items.*' => ['string', 'max:100'],
            'skill_narratives' => ['nullable', 'array'],
            'skill_narratives.*.name' => ['required_with:skill_narratives', 'string', 'max:150'],
            'skill_narratives.*.bullets' => ['required_with:skill_narratives', 'array'],
            'skill_narratives.*.bullets.*' => ['string', 'max:500'],
            'certifications' => ['nullable', 'array'],
            'certifications.*.expiration' => ['nullable', 'string', 'max:100'],
            'certifications.*.credential_id' => ['nullable', 'string', 'max:200'],
            'font_sizes' => ['nullable', 'array'],
            'section_order' => ['nullable', 'array'],
            'section_order.*' => ['string'],
            'custom_sections' => ['nullable', 'array'],
        ];
    }

    public static function copyFields(): array
    {
        return [
            'template', 'accent_color', 'font_family', 'summary', 'target_job_description', 'contact',
            'experience', 'education', 'projects', 'skills', 'skills_layout', 'skills_groups', 'skill_narratives',
            'certifications', 'font_sizes', 'custom_sections', 'section_order',
        ];
    }
}
