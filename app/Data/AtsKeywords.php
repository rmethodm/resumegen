<?php

namespace App\Data;

class AtsKeywords
{
    public const ACTION_VERBS = [
        'achieved', 'accelerated', 'adapted', 'administered', 'analyzed', 'architected',
        'automated', 'built', 'collaborated', 'created', 'delivered', 'deployed',
        'designed', 'developed', 'directed', 'drove', 'engineered', 'enhanced',
        'established', 'executed', 'expanded', 'facilitated', 'generated', 'implemented',
        'improved', 'increased', 'initiated', 'integrated', 'launched', 'led',
        'managed', 'mentored', 'migrated', 'negotiated', 'optimized', 'orchestrated',
        'oversaw', 'pioneered', 'planned', 'produced', 'reduced', 'refactored',
        'researched', 'resolved', 'scaled', 'shipped', 'solved', 'spearheaded',
        'streamlined', 'supervised', 'trained', 'transformed',
    ];

    public const TECHNICAL = [
        'php', 'laravel', 'symfony', 'python', 'django', 'flask', 'fastapi',
        'javascript', 'typescript', 'react', 'vue', 'angular', 'svelte', 'next.js',
        'node.js', 'express', 'nestjs', 'java', 'spring', 'kotlin', 'go', 'rust',
        'ruby', 'rails', 'c#', '.net', 'swift', 'objective-c',
        'mysql', 'postgresql', 'sqlite', 'mongodb', 'redis', 'elasticsearch',
        'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'ansible',
        'jenkins', 'github actions', 'gitlab ci', 'circleci',
        'rest', 'graphql', 'grpc', 'websockets', 'oauth', 'jwt',
        'tdd', 'ci/cd', 'agile', 'scrum', 'kanban',
        'html', 'css', 'tailwind', 'sass', 'webpack', 'vite',
        'figma', 'sketch', 'jira', 'confluence', 'slack',
        'tensorflow', 'pytorch', 'pandas', 'numpy', 'jupyter',
        'sql', 'nosql', 'etl', 'data warehouse', 'snowflake', 'bigquery',
        'unit testing', 'integration testing', 'cypress', 'jest', 'phpunit', 'pytest',
        'linux', 'bash', 'git', 'github', 'gitlab', 'bitbucket',
        'microservices', 'monolith', 'serverless', 'lambda',
    ];

    public const SOFT_SKILLS = [
        'leadership', 'communication', 'collaboration', 'problem solving', 'teamwork',
        'mentorship', 'cross-functional', 'stakeholder', 'strategic', 'analytical',
        'detail-oriented', 'customer-focused', 'self-starter', 'ownership',
        'adaptability', 'time management', 'prioritization', 'decision making',
        'critical thinking', 'creativity', 'initiative', 'accountability',
    ];

    public static function quantifiedAchievementRegex(): string
    {
        return '/(\$\s?\d|\d+\s?(%|x|\+|k\b|m\b|million|billion))/i';
    }
}
