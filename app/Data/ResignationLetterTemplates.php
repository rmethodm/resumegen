<?php

namespace App\Data;

class ResignationLetterTemplates
{
    public const TEMPLATES = [
        'standard' => [
            'label' => 'Standard',
            'description' => 'A professional two-weeks-notice resignation letter.',
            'body' => "Dear [Manager's Name],\n\nI am writing to formally notify you of my resignation from my position as {{role}} at {{company}}, effective {{last_day}}.\n\n[Body paragraph about your time at the company]\n\n[Body paragraph about the transition]\n\nThank you for the opportunity to work here.\n\nSincerely,\n{{name}}",
        ],
        'immediate' => [
            'label' => 'Immediate / Short Notice',
            'description' => 'For resigning with little or no notice period.',
            'body' => "Dear [Manager's Name],\n\nI am writing to inform you of my immediate resignation from my position as {{role}} at {{company}}, effective {{last_day}}.\n\n[Brief explanation, if appropriate]\n\nI apologize for any inconvenience this may cause and will assist with the transition wherever possible in the time available.\n\nSincerely,\n{{name}}",
        ],
        'warm' => [
            'label' => 'Warm & Grateful',
            'description' => 'Emphasizes gratitude and preserves the relationship.',
            'body' => "Dear [Manager's Name],\n\nAfter much thought, I have decided to resign from my position as {{role}} at {{company}}, effective {{last_day}}.\n\n[Paragraph expressing gratitude for specific opportunities or growth]\n\n[Paragraph on ensuring a smooth transition]\n\nThank you again for everything. I hope to stay in touch.\n\nWarm regards,\n{{name}}",
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
            'name' => '',
            'company' => '[Company]',
            'role' => '[Role]',
            'last_day' => '[Last Day]',
        ];
        $merged = array_merge($defaults, $vars);
        foreach ($merged as $k => $v) {
            $tpl = str_replace('{{'.$k.'}}', (string) $v, $tpl);
        }

        return $tpl;
    }
}
