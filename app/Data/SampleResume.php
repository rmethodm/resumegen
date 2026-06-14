<?php

namespace App\Data;

class SampleResume
{
    /**
     * Fixed, realistic resume content used only to render template preview images.
     *
     * Key shapes match what `resources/views/resume-pdf.blade.php` and
     * `resources/views/partials/resume-body.blade.php` actually read.
     *
     * @return array<string, mixed>
     */
    public static function data(): array
    {
        return [
            'name' => 'Sample Resume',
            'template' => 'classic',
            'accent_color' => '#4f46e5',
            'font_family' => 'Inter',
            'contact' => [
                'full_name' => 'Alex Morgan',
                'title' => 'Senior Product Designer',
                'email' => 'alex.morgan@example.com',
                'phone' => '(555) 123-4567',
                'location' => 'San Francisco, CA',
                'linkedin' => 'linkedin.com/in/alexmorgan',
                'website' => 'alexmorgan.design',
            ],
            'summary' => 'Product designer with 8 years of experience shipping consumer and B2B software. Led design for products serving 2M+ users.',
            'experience' => [
                [
                    'title' => 'Senior Product Designer',
                    'company' => 'Northwind Labs',
                    'start_date' => '2021',
                    'end_date' => '',
                    'current' => true,
                    'bullets' => "Redesigned onboarding, lifting activation 34%.\nBuilt the design system adopted across 6 teams.",
                ],
                [
                    'title' => 'Product Designer',
                    'company' => 'Brightwave',
                    'start_date' => '2017',
                    'end_date' => '2021',
                    'current' => false,
                    'bullets' => 'Shipped the mobile app from zero to 500k downloads.',
                ],
            ],
            'education' => [
                [
                    'school' => 'University of California, Berkeley',
                    'degree' => 'B.A.',
                    'field' => 'Design',
                    'grad_year' => '2017',
                ],
            ],
            'skills' => ['Figma', 'Prototyping', 'User Research', 'Design Systems', 'HTML/CSS'],
            'certifications' => [],
            'section_order' => ['summary', 'experience', 'education', 'skills'],
            'custom_sections' => [],
        ];
    }
}
