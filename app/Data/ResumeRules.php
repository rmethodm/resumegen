<?php

namespace App\Data;

class ResumeRules
{
    public static function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'template' => ['sometimes', 'required', 'in:classic,modern,minimal,minimal-ruled,sidebar,creative,executive,ats,skills-first,skills-first-visual,academic,bold,timeline'],
            'accent_color' => ['sometimes', 'nullable', 'in:#4f46e5,#1e3a5f,#475569,#166534,#7f1d1d,#1f2937,#0f766e,#78716c'],
            'font_family' => ['sometimes', 'nullable', 'in:sans,serif,mono'],
            'summary' => ['nullable', 'string'],
            'contact' => ['nullable', 'array'],
            'experience' => ['nullable', 'array'],
            'education' => ['nullable', 'array'],
            'skills' => ['nullable', 'array'],
            'skills_layout' => ['sometimes', 'nullable', 'in:inline,bullets,grouped-vertical,grouped-inline,narrative'],
            'skills_groups' => ['nullable', 'array'],
            'skills_groups.*.category' => ['required_with:skills_groups', 'string', 'max:100'],
            'skills_groups.*.items' => ['required_with:skills_groups', 'array'],
            'skills_groups.*.items.*' => ['string', 'max:100'],
            'skill_narratives' => ['nullable', 'array'],
            'skill_narratives.*.name' => ['required_with:skill_narratives', 'string', 'max:150'],
            'skill_narratives.*.bullets' => ['required_with:skill_narratives', 'array'],
            'skill_narratives.*.bullets.*' => ['string', 'max:500'],
            'certifications' => ['nullable', 'array'],
            'font_sizes' => ['nullable', 'array'],
            'section_order' => ['nullable', 'array'],
            'section_order.*' => ['string'],
            'custom_sections' => ['nullable', 'array'],
        ];
    }

    public static function copyFields(): array
    {
        return [
            'template', 'accent_color', 'font_family', 'summary', 'contact',
            'experience', 'education', 'skills', 'skills_layout', 'skills_groups', 'skill_narratives',
            'certifications', 'font_sizes', 'custom_sections', 'section_order',
        ];
    }
}
