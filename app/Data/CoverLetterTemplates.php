<?php

namespace App\Data;

class CoverLetterTemplates
{
    public const TEMPLATES = [
        'standard' => [
            'label'       => 'Standard',
            'description' => 'A classic, professional cover letter for most roles.',
            'body'        => "Dear Hiring Manager,\n\nI am writing to express my interest in the {{role}} position at {{company}}. With my background and skills, I am confident I would be a valuable addition to your team.\n\n[Body paragraph about relevant experience]\n\n[Body paragraph about why this company]\n\nThank you for considering my application. I look forward to discussing this opportunity with you.\n\nSincerely,\n{{name}}",
        ],
        'modern' => [
            'label'       => 'Modern',
            'description' => 'Short, punchy, conversational — great for startups.',
            'body'        => "Hi {{company}} team,\n\nI'd love to join you as {{role}}. Here's why:\n\n[3-4 sentences on your biggest relevant win]\n\n[1-2 sentences on what excites you about this company]\n\nLet's talk — {{name}}",
        ],
        'career_change' => [
            'label'       => 'Career Change',
            'description' => 'Highlights transferable skills for a pivot into a new field.',
            'body'        => "Dear Hiring Manager,\n\nMy career has taken an unconventional path to {{role}}, and that's exactly why I'm the right fit for {{company}}.\n\n[Paragraph: transferable skills from previous career]\n\n[Paragraph: specific skills directly applicable to this role]\n\nI'd welcome the chance to discuss how my background brings fresh perspective to your team.\n\nBest,\n{{name}}",
        ],
        'new_grad' => [
            'label'       => 'New Grad',
            'description' => 'Frames coursework, projects, and energy for early-career roles.',
            'body'        => "Dear Hiring Manager,\n\nAs a recent graduate eager to begin my career, I am excited to apply for the {{role}} position at {{company}}.\n\n[Paragraph: relevant coursework, projects, or internships]\n\n[Paragraph: enthusiasm for the company and role]\n\nThank you for this opportunity. I am ready to bring fresh energy and skills to your team.\n\nSincerely,\n{{name}}",
        ],
        'referral' => [
            'label'       => 'Referral',
            'description' => 'Opens with a referral hook for warmest possible intro.',
            'body'        => "Dear Hiring Manager,\n\nI was referred to this opportunity by [Referral Name], who spoke highly of {{company}} and thought my background would be a strong match for the {{role}} position.\n\n[Paragraph: relevant experience]\n\n[Paragraph: why you're excited about this role]\n\nThank you for your time and consideration.\n\nBest regards,\n{{name}}",
        ],
    ];

    public static function keys(): array
    {
        return array_keys(self::TEMPLATES);
    }

    public static function render(string $key, array $vars = []): string
    {
        $tpl = self::TEMPLATES[$key]['body'] ?? '';
        $defaults = [
            'name'    => '',
            'company' => '[Company]',
            'role'    => '[Role]',
            'date'    => now()->format('F j, Y'),
        ];
        $merged = array_merge($defaults, $vars);
        foreach ($merged as $k => $v) {
            $tpl = str_replace('{{' . $k . '}}', (string) $v, $tpl);
        }
        return $tpl;
    }
}
