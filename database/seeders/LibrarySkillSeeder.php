<?php

namespace Database\Seeders;

use App\Models\LibrarySkill;
use Illuminate\Database\Seeder;

/**
 * The skill catalogue, transcribed from Indeed's "How to Create a Skills List
 * for Your Resume (With Examples)" (verified 2026-07-26 at
 * https://www.indeed.com/career-advice/career-development/skills-list).
 * The article's own intro "Hard skills"/"Soft skills" bullets are
 * descriptive buckets (each paired with a sentence, e.g. "Digital literacy:
 * Proficiency with...") rather than literal add-to-resume terms, so they are
 * excluded; the 8 "Examples of skills" categories plus the 2 "in-demand"
 * lists are the catalogue, since both are phrased as terms to add.
 *
 * Re-running replaces the catalogue in place; rows are matched on
 * category + name, so a user's own resume skills are untouched.
 */
class LibrarySkillSeeder extends Seeder
{
    /**
     * Category => skills, in published order. Which `kind` a category falls
     * under is decided by {@see self::SOFT_CATEGORIES}.
     *
     * @var array<string, list<string>>
     */
    private const CATALOGUE = [
        'Technical' => [
            'Accounting', 'Blueprint drafting', 'Construction', 'Coding', 'Engineering',
            'Product development', 'Programming', 'Quality control', 'Repairing',
            'Spreadsheet creation', 'Testing',
        ],
        'Language' => [
            'Explanation', 'Etiquette awareness', 'Interpretation', 'Introductions',
            'Negotiation', 'Proofreading', 'Public speaking', 'Representation',
            'Speaking', 'Translation', 'Writing',
        ],
        'Design' => [
            '3D modeling', 'Animation', 'Branding', 'Data visualization',
            'Graphic design', 'Layout development', 'Photo and video editing',
            'Typography', 'User experience design', 'User interface development',
            'Web design', 'Wireframing',
        ],
        'Analytical' => [
            'Calculating', 'Computing', 'Cost-benefit analysis', 'Analyzing data',
            'Extrapolating', 'Forecasting', 'Creating graphs', 'Investigating',
            'Modeling', 'Organizing', 'Predicting', 'Researching', 'Statistical analysis',
            'Surveying',
        ],
        'In-demand technical' => [
            'Artificial intelligence and machine learning', 'Cloud computing',
            'Cybersecurity', 'Data analysis', 'Digital marketing and automation',
            'Software and web development',
        ],
        'Interpersonal' => [
            'Building rapport', 'Coaching', 'Collaborating', 'Compassion',
            'Conflict management and resolution', 'Empathy', 'Flexibility',
            'Inspiring others', 'Mediating', 'Motivating', 'Networking', 'Patience',
            'Positivity', 'Reliability', 'Seeking and incorporating feedback',
        ],
        'Critical thinking' => [
            'Assessing', 'Brainstorming', 'Conceptual thinking', 'Creative thinking',
            'Deductive reasoning', 'Evaluating', 'Collecting evidence',
            'Inductive reasoning', 'Inferring', 'Observing', 'Problem-solving',
            'Simplifying complex ideas', 'Strategic planning', 'Streamlining processes',
            'Troubleshooting',
        ],
        'Communication' => [
            'Active listening', 'Customer service', 'Documenting', 'Editing', 'Inquiring',
            'Negotiating', 'Nonverbal communication', 'Open-mindedness',
            'Presentation skills', 'Providing constructive feedback', 'Reporting',
            'Storytelling', 'Summarizing', 'Teaching', 'Written communication',
        ],
        'Leadership' => [
            'Adapting to change', 'Managing crises', 'Delegating', 'Directing',
            'Earning trust', 'Envisioning', 'Developing employees', 'Setting goals',
            'Influencing', 'Managing', 'Mentoring', 'Conducting performance reviews',
            'Planning', 'Supervising', 'Training',
        ],
        'In-demand soft' => [
            'Adaptability and resilience', 'Analytical thinking',
            'Communication and storytelling', 'Emotional intelligence',
            'Leadership and people management',
        ],
    ];

    /** @var list<string> */
    private const SOFT_CATEGORIES = [
        'Interpersonal', 'Critical thinking', 'Communication', 'Leadership',
        'In-demand soft',
    ];

    public function run(): void
    {
        $position = 0;

        foreach (self::CATALOGUE as $category => $names) {
            $kind = in_array($category, self::SOFT_CATEGORIES, true)
                ? LibrarySkill::KIND_SOFT
                : LibrarySkill::KIND_HARD;

            foreach ($names as $name) {
                LibrarySkill::updateOrCreate(
                    ['category' => $category, 'name' => $name],
                    ['kind' => $kind, 'position' => $position++],
                );
            }
        }
    }
}
