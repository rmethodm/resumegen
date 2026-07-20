<?php

namespace Database\Seeders;

use App\Models\Resume;
use App\Models\ResumeShareEvent;
use App\Models\ResumeShareLink;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Four realistic resumes, each with 1-4 share links spread across every state
 * the /shares page renders: primary, password-protected, expired, inactive,
 * and links with unread vs. fully-read visit history.
 *
 * Idempotent — reseeding replaces only the resumes named below.
 */
class SampleSharesSeeder extends Seeder
{
    /** Share-link password for every protected link this seeder creates. */
    private const LINK_PASSWORD = 'password';

    public function run(): void
    {
        // Runs on a freshly wiped database too, so the owning account may not exist yet.
        $user = User::firstOrCreate(
            ['email' => 'rmethodm@outlook.com'],
            [
                'name' => 'Richard Method',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
            ]
        );

        foreach ($this->resumes() as $data) {
            Resume::where('user_id', $user->id)->where('name', $data['name'])->get()->each->delete();

            $resume = Resume::create([
                'user_id' => $user->id,
                'name' => $data['name'],
                'template' => $data['template'],
                'summary' => $data['summary'],
                'contact' => $data['contact'],
                'experience' => $data['experience'],
                'education' => $data['education'],
                'skills' => $data['skills'],
                'certifications' => $data['certifications'],
                'projects' => $data['projects'] ?? [],
            ]);

            foreach ($data['links'] as $link) {
                $this->createLink($resume, $link);
            }
        }
    }

    /**
     * @param  array<string, mixed>  $spec
     */
    private function createLink(Resume $resume, array $spec): void
    {
        $link = ResumeShareLink::create([
            'resume_id' => $resume->id,
            'token' => Str::random(48),
            'label' => $spec['label'],
            'is_active' => $spec['is_active'] ?? true,
            'is_primary' => $spec['is_primary'] ?? false,
            'expires_at' => isset($spec['expires_in_days']) ? now()->addDays($spec['expires_in_days']) : null,
            'password_hash' => ($spec['password'] ?? false) ? Hash::make(self::LINK_PASSWORD) : null,
            // Anything older than this counts as "read"; null means every visit is unread.
            'views_seen_at' => isset($spec['seen_days_ago']) ? now()->subDays($spec['seen_days_ago']) : null,
        ]);

        for ($i = 0; $i < ($spec['views'] ?? 0); $i++) {
            $visitor = self::VISITORS[$i % count(self::VISITORS)];

            ResumeShareEvent::create([
                'resume_share_link_id' => $link->id,
                'resume_id' => $resume->id,
                'event' => 'page_view',
                // Spread across the last 7 days so the sparkline has shape.
                'created_at' => now()->subDays($i % 7)->subHours($i * 3),
                'ip_hash' => hash('sha256', $link->id.'-visitor-'.($i % 4)),
                'user_agent' => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                'referrer' => $visitor['referrer'],
                'duration_ms' => $visitor['duration_ms'],
                'country' => $visitor['country'],
                'region' => $visitor['region'],
                'city' => $visitor['city'],
            ]);
        }
    }

    /** @var list<array<string, mixed>> */
    private const VISITORS = [
        ['referrer' => 'https://www.linkedin.com/feed/', 'city' => 'San Francisco', 'region' => 'CA', 'country' => 'US', 'duration_ms' => 142000],
        ['referrer' => null, 'city' => 'Austin', 'region' => 'TX', 'country' => 'US', 'duration_ms' => 38000],
        ['referrer' => 'https://mail.google.com/', 'city' => 'London', 'region' => 'England', 'country' => 'GB', 'duration_ms' => 291000],
        ['referrer' => 'https://www.indeed.com/jobs', 'city' => 'Toronto', 'region' => 'ON', 'country' => 'CA', 'duration_ms' => 71000],
        ['referrer' => null, 'city' => 'Berlin', 'region' => 'BE', 'country' => 'DE', 'duration_ms' => 12000],
    ];

    /**
     * @return list<array<string, mixed>>
     */
    private function resumes(): array
    {
        return [
            [
                'name' => 'Sample — Backend Engineer',
                'template' => 'classic',
                'summary' => 'Backend engineer with 9 years building high-throughput APIs and data pipelines. Focused on reliability, observability, and keeping systems boring enough to sleep through.',
                'contact' => ['full_name' => 'Dana Whitfield', 'email' => 'dana.whitfield@example.com', 'phone' => '(415) 555-0142', 'location' => 'San Francisco, CA', 'linkedin' => 'linkedin.com/in/danawhitfield', 'website' => 'danawhitfield.dev'],
                'experience' => [
                    ['id' => (string) Str::uuid(), 'company' => 'Northgate Systems', 'title' => 'Staff Backend Engineer', 'start_date' => 'Feb 2021', 'end_date' => 'Present', 'current' => true, 'bullets' => "Rebuilt billing ingestion pipeline to handle 40M events/day, cutting reconciliation errors from 1.2% to 0.03%\nIntroduced structured tracing across 14 services, reducing mean incident diagnosis time from 45 to 8 minutes\nMentored 4 engineers through promotion to senior"],
                    ['id' => (string) Str::uuid(), 'company' => 'Fernwood Labs', 'title' => 'Senior Backend Engineer', 'start_date' => 'Aug 2017', 'end_date' => 'Jan 2021', 'current' => false, 'bullets' => "Designed idempotent webhook delivery system with exponential backoff, achieving 99.98% delivery\nCut p99 API latency from 1.4s to 210ms by replacing N+1 ORM access with batched loaders\nOwned on-call rotation for 6 services and drove postmortem culture"],
                    ['id' => (string) Str::uuid(), 'company' => 'Harborline', 'title' => 'Backend Engineer', 'start_date' => 'Jun 2015', 'end_date' => 'Jul 2017', 'current' => false, 'bullets' => "Built internal reporting API consumed by 3 downstream teams\nMigrated scheduled jobs from cron to a queue-backed worker pool"],
                ],
                'education' => [
                    ['id' => (string) Str::uuid(), 'school' => 'Cal Poly San Luis Obispo', 'degree' => 'B.S.', 'field' => 'Computer Science', 'grad_year' => '2015'],
                ],
                'skills' => ['Go', 'PHP/Laravel', 'PostgreSQL', 'Kafka', 'Redis', 'Terraform', 'OpenTelemetry'],
                'certifications' => [
                    ['id' => (string) Str::uuid(), 'name' => 'AWS Certified Solutions Architect — Associate', 'issuer' => 'Amazon Web Services', 'date' => '2022-03', 'expiration' => '2028-03', 'credential_id' => 'AWS-SAA-88213'],
                ],
                'projects' => [
                    ['id' => (string) Str::uuid(), 'name' => 'pgqueue', 'description' => 'Minimal Postgres-backed job queue for small Go services.', 'url' => 'github.com/dwhitfield/pgqueue', 'start_date' => '2022', 'end_date' => '', 'bullets' => "1.2k GitHub stars\nUsed in production by 3 companies"],
                ],
                'links' => [
                    // 2 links: primary with half its visits unread, plus a plain second link.
                    ['label' => 'Primary — public profile', 'is_primary' => true, 'views' => 9, 'seen_days_ago' => 3],
                    ['label' => 'Recruiter — Acme Corp', 'views' => 3],
                ],
            ],
            [
                'name' => 'Sample — ICU Nurse',
                'template' => 'modern',
                'summary' => 'Critical care nurse with 8 years in Level I trauma ICUs. Preceptor, rapid response team lead, and stubborn patient advocate.',
                'contact' => ['full_name' => 'Marcus Adeyemi', 'email' => 'm.adeyemi@example.com', 'phone' => '(713) 555-0198', 'location' => 'Houston, TX', 'linkedin' => 'linkedin.com/in/marcusadeyemi', 'website' => ''],
                'experience' => [
                    ['id' => (string) Str::uuid(), 'company' => 'Bayou General Hospital', 'title' => 'Senior RN, Surgical ICU', 'start_date' => 'Apr 2019', 'end_date' => 'Present', 'current' => true, 'bullets' => "Manage 2:1 patient assignments in a 28-bed Level I trauma ICU\nPrecepted 11 new-graduate nurses, 10 of whom remain on unit after 2 years\nCo-authored sedation weaning protocol that reduced average ventilator days by 1.6"],
                    ['id' => (string) Str::uuid(), 'company' => 'St. Cecilia Medical', 'title' => 'RN, Medical-Surgical', 'start_date' => 'Jul 2016', 'end_date' => 'Mar 2019', 'current' => false, 'bullets' => "Carried 6-patient assignments across a 40-bed med-surg floor\nServed on unit practice council driving a 27% drop in CAUTI rates\nCertified as charge nurse within 14 months"],
                ],
                'education' => [
                    ['id' => (string) Str::uuid(), 'school' => 'University of Texas Health Science Center', 'degree' => 'B.S.N.', 'field' => 'Nursing', 'grad_year' => '2016'],
                ],
                'skills' => ['Critical Care', 'Ventilator Management', 'ACLS/PALS', 'Epic', 'Hemodynamic Monitoring', 'Preceptorship', 'Rapid Response'],
                'certifications' => [
                    ['id' => (string) Str::uuid(), 'name' => 'CCRN (Adult)', 'issuer' => 'AACN', 'date' => '2019-09', 'expiration' => '2027-09', 'credential_id' => 'CCRN-441902'],
                    ['id' => (string) Str::uuid(), 'name' => 'TNCC Provider', 'issuer' => 'Emergency Nurses Association', 'date' => '2021-02', 'expiration' => '', 'credential_id' => ''],
                ],
                'links' => [
                    // 2 links: a fully-read primary, and a password-gated link nobody has opened.
                    ['label' => 'Primary — travel agency submissions', 'is_primary' => true, 'views' => 6, 'seen_days_ago' => 0],
                    ['label' => 'Confidential — recruiter only', 'password' => true, 'views' => 0],
                ],
            ],
            [
                'name' => 'Sample — Marketing Manager',
                'template' => 'modern',
                'summary' => 'Demand-gen marketer with 7 years scaling B2B SaaS pipelines. Equal parts editorial instinct and spreadsheet discipline.',
                'contact' => ['full_name' => 'Priya Raghunathan', 'email' => 'priya.r@example.com', 'phone' => '(312) 555-0176', 'location' => 'Chicago, IL', 'linkedin' => 'linkedin.com/in/priyaraghunathan', 'website' => 'priyawrites.co'],
                'experience' => [
                    ['id' => (string) Str::uuid(), 'company' => 'Loomis Software', 'title' => 'Marketing Manager, Demand Gen', 'start_date' => 'Jan 2021', 'end_date' => 'Present', 'current' => true, 'bullets' => "Grew marketing-sourced pipeline from \$4M to \$19M ARR in 3 years\nRebuilt attribution model, reclassifying 31% of leads and reallocating \$600K in spend\nManage a team of 3 and a \$2.4M annual budget"],
                    ['id' => (string) Str::uuid(), 'company' => 'Tandem Analytics', 'title' => 'Growth Marketing Specialist', 'start_date' => 'Sep 2018', 'end_date' => 'Dec 2020', 'current' => false, 'bullets' => "Scaled organic traffic 4x through a 60-article topic-cluster program\nLaunched lifecycle email program contributing \$1.1M in influenced revenue\nRan 40+ landing page A/B tests, lifting demo conversion from 2.1% to 5.4%"],
                ],
                'education' => [
                    ['id' => (string) Str::uuid(), 'school' => 'University of Illinois Urbana-Champaign', 'degree' => 'B.S.', 'field' => 'Advertising', 'grad_year' => '2018'],
                ],
                'skills' => ['Demand Generation', 'HubSpot', 'Google Ads', 'SQL', 'Attribution Modeling', 'Content Strategy', 'Webflow'],
                'certifications' => [
                    ['id' => (string) Str::uuid(), 'name' => 'Google Ads Search Certification', 'issuer' => 'Google', 'date' => '2024-01', 'expiration' => '2026-01', 'credential_id' => ''],
                ],
                'links' => [
                    // 3 links: active primary with traffic, an expired link, and a manually disabled one.
                    ['label' => 'Primary — LinkedIn bio', 'is_primary' => true, 'views' => 14, 'seen_days_ago' => 5],
                    ['label' => 'Expired — Q2 job fair', 'expires_in_days' => -6, 'views' => 4, 'seen_days_ago' => 1],
                    ['label' => 'Disabled — old portfolio link', 'is_active' => false, 'views' => 2],
                ],
            ],
            [
                'name' => 'Sample — Recent Grad, Data Analyst',
                'template' => 'minimal',
                'summary' => 'Recent statistics graduate with internship experience in healthcare analytics. Comfortable in SQL and Python, and unreasonably fond of clean data dictionaries.',
                'contact' => ['full_name' => 'Sofia Delgado', 'email' => 'sofia.delgado@example.com', 'phone' => '(206) 555-0133', 'location' => 'Seattle, WA', 'linkedin' => 'linkedin.com/in/sofiadelgado', 'website' => ''],
                'experience' => [
                    ['id' => (string) Str::uuid(), 'company' => 'Cascade Health Partners', 'title' => 'Data Analytics Intern', 'start_date' => 'Jun 2025', 'end_date' => 'Aug 2025', 'current' => false, 'bullets' => "Built readmission-risk dashboard adopted by 2 clinical directors\nCleaned and documented a 9-table claims dataset previously undocumented\nAutomated a weekly report that had taken an analyst 5 hours by hand"],
                    ['id' => (string) Str::uuid(), 'company' => 'University of Washington', 'title' => 'Undergraduate Research Assistant', 'start_date' => 'Jan 2024', 'end_date' => 'May 2025', 'current' => false, 'bullets' => "Ran regression analyses for a study on transit access and clinic attendance\nCo-presented findings at the undergraduate research symposium"],
                ],
                'education' => [
                    ['id' => (string) Str::uuid(), 'school' => 'University of Washington', 'degree' => 'B.S.', 'field' => 'Statistics', 'grad_year' => '2025'],
                ],
                'skills' => ['SQL', 'Python (pandas)', 'R', 'Tableau', 'Excel', 'Data Cleaning', 'A/B Testing'],
                'certifications' => [
                    ['id' => (string) Str::uuid(), 'name' => 'Google Data Analytics Certificate', 'issuer' => 'Google', 'date' => '2024-11', 'expiration' => '', 'credential_id' => ''],
                ],
                'projects' => [
                    ['id' => (string) Str::uuid(), 'name' => 'Seattle Bus Delay Explorer', 'description' => 'Interactive map of King County Metro delays built from public GTFS feeds.', 'url' => 'sofiadelgado.github.io/bus-delays', 'start_date' => '2025', 'end_date' => '', 'bullets' => "Ingests 2 years of GTFS-realtime data\nBuilt with Python, DuckDB, and Observable Plot"],
                ],
                'links' => [
                    // 3 links, including a never-viewed one. Expired is covered by the resume above.
                    ['label' => 'Primary — resume for applications', 'is_primary' => true, 'views' => 11, 'seen_days_ago' => 2],
                    ['label' => 'Password — referral from Dr. Chen', 'password' => true, 'views' => 5, 'seen_days_ago' => 4],
                    ['label' => 'Fresh — not yet sent', 'views' => 0],
                ],
            ],
        ];
    }
}
