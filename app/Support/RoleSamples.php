<?php

namespace App\Support;

/**
 * Curated role sample resumes for "Use this sample" on create.
 * Deterministic content only — no AI.
 *
 * @phpstan-type Sample array{
 *   id: string,
 *   label: string,
 *   description: string,
 *   target_role: string,
 *   document: array<string, mixed>
 * }
 */
final class RoleSamples
{
    /**
     * @return list<Sample>
     */
    public static function all(): array
    {
        return [
            self::softwareEngineer(),
            self::dataScientist(),
            self::productManager(),
            self::marketingManager(),
        ];
    }

    /**
     * @return list<string>
     */
    public static function ids(): array
    {
        return array_column(self::all(), 'id');
    }

    /**
     * @return Sample|null
     */
    public static function find(string $id): ?array
    {
        foreach (self::all() as $sample) {
            if ($sample['id'] === $id) {
                return $sample;
            }
        }

        return null;
    }

    /**
     * Public catalogue for the create modal (no full document body).
     *
     * @return list<array{id: string, label: string, description: string, target_role: string}>
     */
    public static function catalogue(): array
    {
        return array_map(
            fn (array $sample): array => [
                'id' => $sample['id'],
                'label' => $sample['label'],
                'description' => $sample['description'],
                'target_role' => $sample['target_role'],
            ],
            self::all(),
        );
    }

    /**
     * @return Sample
     */
    private static function softwareEngineer(): array
    {
        return [
            'id' => 'software-engineer',
            'label' => 'Software Engineer',
            'description' => 'Full-stack product engineering with APIs and testing.',
            'target_role' => 'Software Engineer',
            'document' => [
                'title' => 'Software Engineer sample',
                'target_role' => 'Software Engineer',
                'headline' => 'Software Engineer',
                'summary' => 'Software engineer with 5+ years building TypeScript/React products and reliable APIs. Focused on performance, testing, and shipping measurable outcomes with cross-functional teams.',
                'template' => 'engineering',
                'experiences' => [
                    [
                        'title' => 'Software Engineer',
                        'company' => 'Northline Labs',
                        'start_date' => '2021-03',
                        'end_date' => '',
                        'is_current' => true,
                        'bullets' => [
                            'Shipped React + TypeScript features used by 120k monthly active users.',
                            'Cut p95 API latency 35% by rewriting hot paths and adding query caching.',
                            'Raised unit test coverage from 42% to 81% and blocked regressions in CI/CD.',
                        ],
                    ],
                    [
                        'title' => 'Junior Developer',
                        'company' => 'Bright Harbor',
                        'start_date' => '2019-06',
                        'end_date' => '2021-02',
                        'is_current' => false,
                        'bullets' => [
                            'Built internal tooling that reduced support ticket triage time by 20%.',
                            'Collaborated with design on accessibility fixes across 8 core flows.',
                        ],
                    ],
                ],
                'education' => [
                    [
                        'school' => 'State University',
                        'degree' => 'B.S.',
                        'field' => 'Computer Science',
                        'graduation_year' => '2019',
                    ],
                ],
                'skills' => [
                    ['category' => 'Languages', 'name' => 'TypeScript'],
                    ['category' => 'Languages', 'name' => 'Python'],
                    ['category' => 'Frontend', 'name' => 'React'],
                    ['category' => 'Backend', 'name' => 'API design'],
                    ['category' => 'Practice', 'name' => 'Testing'],
                    ['category' => 'Practice', 'name' => 'CI/CD'],
                    ['category' => 'Practice', 'name' => 'Performance'],
                ],
                'projects' => [],
                'certificates' => [],
            ],
        ];
    }

    /**
     * @return Sample
     */
    private static function dataScientist(): array
    {
        return [
            'id' => 'data-scientist',
            'label' => 'Data Scientist',
            'description' => 'SQL, Python, experimentation, and decision-ready dashboards.',
            'target_role' => 'Data Scientist',
            'document' => [
                'title' => 'Data Scientist sample',
                'target_role' => 'Data Scientist',
                'headline' => 'Data Scientist',
                'summary' => 'Data scientist who turns messy product data into experiments and models stakeholders trust. Strong in SQL, Python, and dashboard storytelling that drives roadmap decisions.',
                'template' => 'metric-cards',
                'experiences' => [
                    [
                        'title' => 'Data Scientist',
                        'company' => 'Horizon Analytics',
                        'start_date' => '2020-08',
                        'end_date' => '',
                        'is_current' => true,
                        'bullets' => [
                            'Designed A/B tests that improved activation 9% across the growth funnel.',
                            'Built ETL pipelines processing 40M rows daily with validated data quality checks.',
                            'Shipped executive dashboards that cut weekly reporting prep from 6 hours to 45 minutes.',
                        ],
                    ],
                ],
                'education' => [
                    [
                        'school' => 'Metro University',
                        'degree' => 'M.S.',
                        'field' => 'Statistics',
                        'graduation_year' => '2020',
                    ],
                ],
                'skills' => [
                    ['category' => 'Languages', 'name' => 'SQL'],
                    ['category' => 'Languages', 'name' => 'Python'],
                    ['category' => 'Analytics', 'name' => 'Experimentation'],
                    ['category' => 'Analytics', 'name' => 'Modeling'],
                    ['category' => 'Analytics', 'name' => 'Dashboard'],
                    ['category' => 'Data', 'name' => 'ETL'],
                ],
                'projects' => [],
                'certificates' => [],
            ],
        ];
    }

    /**
     * @return Sample
     */
    private static function productManager(): array
    {
        return [
            'id' => 'product-manager',
            'label' => 'Product Manager',
            'description' => 'Discovery, roadmaps, metrics, and stakeholder alignment.',
            'target_role' => 'Product Manager',
            'document' => [
                'title' => 'Product Manager sample',
                'target_role' => 'Product Manager',
                'headline' => 'Product Manager',
                'summary' => 'Product manager who pairs discovery with clear prioritization. Comfortable with roadmaps, metrics, stakeholder tradeoffs, and shipping outcomes with engineering and design.',
                'template' => 'modern',
                'experiences' => [
                    [
                        'title' => 'Product Manager',
                        'company' => 'Cascade Apps',
                        'start_date' => '2021-01',
                        'end_date' => '',
                        'is_current' => true,
                        'bullets' => [
                            'Owned roadmap for core workflow used by 18 enterprise customers.',
                            'Ran discovery interviews that killed 2 low-ROI bets and unlocked a $1.2M expansion.',
                            'Defined success metrics and A/B testing plan that raised trial-to-paid conversion 11%.',
                        ],
                    ],
                ],
                'education' => [
                    [
                        'school' => 'Coastal College',
                        'degree' => 'B.A.',
                        'field' => 'Economics',
                        'graduation_year' => '2017',
                    ],
                ],
                'skills' => [
                    ['category' => 'Product', 'name' => 'Roadmap'],
                    ['category' => 'Product', 'name' => 'Discovery'],
                    ['category' => 'Product', 'name' => 'Stakeholder management'],
                    ['category' => 'Product', 'name' => 'Metrics'],
                    ['category' => 'Product', 'name' => 'A/B testing'],
                    ['category' => 'Product', 'name' => 'Strategy'],
                ],
                'projects' => [],
                'certificates' => [],
            ],
        ];
    }

    /**
     * @return Sample
     */
    private static function marketingManager(): array
    {
        return [
            'id' => 'marketing-manager',
            'label' => 'Marketing Manager',
            'description' => 'Campaigns, SEO, lifecycle, and content that convert.',
            'target_role' => 'Marketing Manager',
            'document' => [
                'title' => 'Marketing Manager sample',
                'target_role' => 'Marketing Manager',
                'headline' => 'Marketing Manager',
                'summary' => 'Marketing manager focused on lifecycle campaigns, SEO, and content that compounds. Pairs creative positioning with analytics so spend ties to pipeline, not vanity metrics.',
                'template' => 'classic',
                'experiences' => [
                    [
                        'title' => 'Marketing Manager',
                        'company' => 'Fieldnote Co.',
                        'start_date' => '2019-04',
                        'end_date' => '',
                        'is_current' => true,
                        'bullets' => [
                            'Led lifecycle campaign that increased qualified leads 28% quarter over quarter.',
                            'Grew organic traffic 64% in 12 months through SEO content clusters and technical fixes.',
                            'Repositioned product messaging used across ads, site, and sales enablement.',
                        ],
                    ],
                ],
                'education' => [
                    [
                        'school' => 'River City University',
                        'degree' => 'B.S.',
                        'field' => 'Marketing',
                        'graduation_year' => '2018',
                    ],
                ],
                'skills' => [
                    ['category' => 'Growth', 'name' => 'Campaign management'],
                    ['category' => 'Growth', 'name' => 'SEO'],
                    ['category' => 'Growth', 'name' => 'Lifecycle marketing'],
                    ['category' => 'Brand', 'name' => 'Positioning'],
                    ['category' => 'Brand', 'name' => 'Content'],
                    ['category' => 'Analytics', 'name' => 'Analytics'],
                ],
                'projects' => [],
                'certificates' => [],
            ],
        ];
    }
}
