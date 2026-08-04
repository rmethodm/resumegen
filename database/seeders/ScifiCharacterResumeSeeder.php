<?php

namespace Database\Seeders;

use App\Models\Resume;
use App\Models\User;
use App\Support\ResumeDocument;
use Illuminate\Database\Seeder;

/**
 * One-shot local demo data: five generous sci-fi character resumes for a user.
 * Run: php artisan db:seed --class=ScifiCharacterResumeSeeder --no-interaction
 */
class ScifiCharacterResumeSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::query()->where('email', 'rmethodm@outlook.com')->first();

        if ($user === null) {
            $this->command?->error('User rmethodm@outlook.com not found.');

            return;
        }

        $created = [];

        foreach ($this->documents() as $document) {
            $resume = $user->resumes()->create([
                'title' => $document['title'],
            ]);
            ResumeDocument::save($resume, $document);
            $created[] = "{$resume->id}: {$document['full_name']} — {$document['title']}";
        }

        foreach ($created as $line) {
            $this->command?->info($line);
        }

        $this->command?->info('Created '.count($created).' resumes for '.$user->email);
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function documents(): array
    {
        return [
            $this->picard(),
            $this->ripley(),
            $this->atredies(),
            $this->scully(),
            $this->organa(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function picard(): array
    {
        return [
            'title' => 'Jean-Luc Picard — Fleet Command & Diplomacy',
            'target_role' => 'Senior Diplomatic Operations Lead',
            'target_company' => '',
            'target_job_description' => '',
            'full_name' => 'Jean-Luc Picard',
            'headline' => 'Fleet Commander · Diplomatic Negotiator · Crisis Leadership',
            'email' => 'jl.picard@starfleet.example',
            'phone' => '+1 (415) 555-1701',
            'location' => 'La Barre, France / San Francisco, CA',
            'linkedin' => 'linkedin.com/in/jeanlucpicard',
            'website' => 'starfleet.example/officers/picard',
            'summary' => 'Seasoned command officer and diplomatic leader with decades of multi-party negotiation, deep-space exploration, and high-stakes crisis response. Proven ability to align diverse stakeholders under pressure, uphold ethical standards without sacrificing mission outcomes, and mentor the next generation of officers. Known for calm decision-making under uncertainty, cross-cultural fluency, and translating strategic intent into disciplined execution across science, engineering, and security functions. Seeking senior leadership roles where exploration, governance, and principled command intersect.',
            'template' => 'executive',
            'font' => 'garamond',
            'density' => 'balanced',
            'skills_layout' => 'grouped',
            'bullet_style' => 'bullet',
            'section_order' => ['contact', 'summary', 'experience', 'project', 'education', 'skills', 'certificate'],
            'experiences' => [
                [
                    'title' => 'Captain, USS Enterprise-D / Enterprise-E',
                    'company' => 'United Federation of Planets — Starfleet',
                    'start_date' => '2364',
                    'end_date' => '',
                    'is_current' => true,
                    'bullets' => [
                        'Commanded a multi-department flagship crew of 1,000+ across exploration, science, engineering, medical, and security mission sets spanning dozens of sectors.',
                        'Led first-contact and treaty negotiations with more than 40 sovereign entities, resolving border disputes without escalation in 90%+ of mediated cases.',
                        'Directed ship-wide crisis response for warp-core, temporal, and biosecurity incidents; maintained crew survival rates above fleet benchmarks under extreme uncertainty.',
                        'Institutionalized after-action reviews and ethics briefings that reduced preventable command errors and improved cross-department coordination on multi-week missions.',
                        'Mentored department heads into independent command track; several officers later assumed captaincies or flag-level roles.',
                        'Balanced scientific discovery priorities with defensive readiness, delivering continuous deep-space operations while meeting diplomatic and humanitarian tasking.',
                    ],
                ],
                [
                    'title' => 'Captain, USS Stargazer',
                    'company' => 'Starfleet Command',
                    'start_date' => '2333',
                    'end_date' => '2355',
                    'is_current' => false,
                    'bullets' => [
                        'Commanded a mid-size explorer through long-range survey campaigns, establishing charted routes later used for colonization and trade corridors.',
                        'Negotiated resource-sharing agreements with non-aligned systems that opened three new scientific collaboration channels for Starfleet Research.',
                        'Rebuilt crew cohesion after combat losses through transparent communication, rigorous drills, and restored trust in command decision processes.',
                        'Authored operational doctrine updates on multi-vector threat assessment later adopted by neighboring task forces.',
                    ],
                ],
                [
                    'title' => 'First Officer / Bridge Command Track',
                    'company' => 'Starfleet — Various Assignments',
                    'start_date' => '2327',
                    'end_date' => '2333',
                    'is_current' => false,
                    'bullets' => [
                        'Rotated through operations, tactical, and diplomatic attaché roles to build full-spectrum command readiness.',
                        'Coordinated joint exercises with allied fleets, standardizing communications protocols that cut misrouting of priority traffic by double digits.',
                        'Led away-team planning for planetary survey missions with strict environmental and cultural non-interference controls.',
                    ],
                ],
                [
                    'title' => 'Archaeology & Anthropology Specialist (Reserve Academic Track)',
                    'company' => 'Starfleet Academy / Independent Fieldwork',
                    'start_date' => '2323',
                    'end_date' => '2327',
                    'is_current' => false,
                    'bullets' => [
                        'Conducted field research on pre-warp civilizations and artifact ethics; published monographs used in Academy cultural studies modules.',
                        'Advised mission planners on archaeological risk zones, preventing three planned landings that would have violated heritage protections.',
                    ],
                ],
            ],
            'projects' => [
                [
                    'name' => 'Federation Border Stability Framework',
                    'url' => '',
                    'start_date' => '2368',
                    'end_date' => '2371',
                    'description' => 'Multi-year diplomatic program to de-escalate contested corridors through joint science missions and transparent inspection protocols.',
                    'highlights' => [
                        'Designed a three-tier mediation ladder (local liaison → sector council → Federation panel) adopted by two neighboring fleets.',
                        'Paired scientific exchange visits with security confidence-building measures, reducing armed intercepts along the corridor by a measurable margin.',
                        'Produced playbooks for captains covering cultural briefings, escalation thresholds, and public messaging under media scrutiny.',
                    ],
                ],
                [
                    'name' => 'Enterprise Crisis Continuity Playbook',
                    'url' => '',
                    'start_date' => '2365',
                    'end_date' => '2367',
                    'description' => 'End-to-end continuity plan for command succession, medical surge, and civilian passenger protection during multi-day emergencies.',
                    'highlights' => [
                        'Mapped decision rights across bridge, engineering, and sickbay for degraded-comms scenarios.',
                        'Ran quarterly tabletop exercises that cut mean time to alternate command assumption during drills.',
                    ],
                ],
                [
                    'name' => 'Officer Leadership Mentorship Cohort',
                    'url' => '',
                    'start_date' => '2366',
                    'end_date' => '2370',
                    'description' => 'Structured mentorship for mid-career officers combining ethics case studies with live mission shadowing.',
                    'highlights' => [
                        'Cohort retention into command track exceeded peer groups without structured mentorship.',
                        'Case library later integrated into Academy elective seminars on ethical command under incomplete information.',
                    ],
                ],
            ],
            'education' => [
                [
                    'school' => 'Starfleet Academy',
                    'degree' => 'Commission',
                    'field' => 'Command & Space Science',
                    'graduation_year' => '2327',
                ],
                [
                    'school' => 'Université de Paris (Historical Studies Track)',
                    'degree' => 'Advanced Study',
                    'field' => 'Archaeology & Comparative Civilizations',
                    'graduation_year' => '2324',
                ],
            ],
            'certificates' => [
                [
                    'name' => 'Flag Officer Command Qualification',
                    'issuer' => 'Starfleet Command',
                    'obtained_at' => '2379',
                    'expires_at' => '',
                    'credential_id' => 'SF-CMD-JL-001',
                ],
                [
                    'name' => 'Advanced Diplomatic Mediation',
                    'issuer' => 'Federation Diplomatic Corps',
                    'obtained_at' => '2360',
                    'expires_at' => '',
                    'credential_id' => 'FDC-MED-440',
                ],
                [
                    'name' => 'First Contact Protocols Lead',
                    'issuer' => 'Starfleet Science Council',
                    'obtained_at' => '2358',
                    'expires_at' => '',
                    'credential_id' => 'SSC-FC-219',
                ],
                [
                    'name' => 'Warp Engineering Systems Awareness (Command Level)',
                    'issuer' => 'Starfleet Engineering',
                    'obtained_at' => '2340',
                    'expires_at' => '',
                    'credential_id' => 'SE-WARP-CMD',
                ],
            ],
            'skills' => [
                ['category' => 'Leadership', 'name' => 'Strategic command'],
                ['category' => 'Leadership', 'name' => 'Crisis decision-making'],
                ['category' => 'Leadership', 'name' => 'Executive mentoring'],
                ['category' => 'Leadership', 'name' => 'Ethics & governance'],
                ['category' => 'Diplomacy', 'name' => 'Treaty negotiation'],
                ['category' => 'Diplomacy', 'name' => 'First contact'],
                ['category' => 'Diplomacy', 'name' => 'Cross-cultural mediation'],
                ['category' => 'Diplomacy', 'name' => 'Stakeholder alignment'],
                ['category' => 'Operations', 'name' => 'Mission planning'],
                ['category' => 'Operations', 'name' => 'Risk assessment'],
                ['category' => 'Operations', 'name' => 'Incident command'],
                ['category' => 'Operations', 'name' => 'Continuity of operations'],
                ['category' => 'Communication', 'name' => 'Public briefings'],
                ['category' => 'Communication', 'name' => 'Conflict de-escalation'],
                ['category' => 'Communication', 'name' => 'Technical storytelling'],
                ['category' => 'Domain', 'name' => 'Space operations'],
                ['category' => 'Domain', 'name' => 'Archaeology ethics'],
                ['category' => 'Domain', 'name' => 'Alliance coordination'],
                ['category' => 'Languages', 'name' => 'Federation Standard'],
                ['category' => 'Languages', 'name' => 'French'],
                ['category' => 'Languages', 'name' => 'Conversational Klingon'],
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function ripley(): array
    {
        return [
            'title' => 'Ellen Ripley — Crisis Ops & Safety Leadership',
            'target_role' => 'Director of Crisis Operations / Safety Engineering',
            'target_company' => '',
            'target_job_description' => '',
            'full_name' => 'Ellen Louise Ripley',
            'headline' => 'Crisis Operations Lead · Warrant Officer · Safety Systems Specialist',
            'email' => 'e.ripley@weyland.example',
            'phone' => '+1 (312) 555-1979',
            'location' => 'Gateway Station / Chicago, IL',
            'linkedin' => 'linkedin.com/in/ellenripley',
            'website' => 'ops.example/ripley',
            'summary' => 'Results-driven operations leader specializing in high-risk environments, containment protocols, and life-critical systems under extreme time pressure. Combines warrant-officer pragmatism with uncompromising safety standards—willing to challenge corporate risk appetite when lives are on the line. Experience spans cargo logistics, emergency ship systems, quarantine enforcement, and multi-team coordination in isolated facilities. Recognized for decisive action, clear communication under stress, and building trust with engineers, medics, and security personnel who must execute together when plans fail. Seeking senior roles in industrial safety, incident command, or mission-critical operations.',
            'template' => 'engineering',
            'font' => 'ibm-plex-sans',
            'density' => 'compact',
            'skills_layout' => 'grouped',
            'bullet_style' => 'bullet',
            'section_order' => ['contact', 'summary', 'experience', 'project', 'skills', 'education', 'certificate'],
            'experiences' => [
                [
                    'title' => 'Warrant Officer / Acting Command Authority',
                    'company' => 'USCSS Nostromo & Follow-on Missions — Commercial Space Freight',
                    'start_date' => '2120',
                    'end_date' => '',
                    'is_current' => true,
                    'bullets' => [
                        'Assumed de facto mission command during catastrophic biohazard events when chain of command was compromised; prioritized crew survival and containment over cargo recovery.',
                        'Designed and enforced ad-hoc quarantine and sterilization procedures that prevented further organism transfer across decks and docking interfaces.',
                        'Led cross-functional emergency teams (engineering, medical, security) through multi-day incidents with degraded systems and limited resupply.',
                        'Documented incident timelines and system failures for subsequent inquiries; recommendations influenced revised corporate safety checklists for deep-space freighters.',
                        'Advocated for transparent risk disclosure to crews, reducing blind reliance on automated mission computers for life-safety decisions.',
                        'Trained junior officers on emergency override ethics: when company protocol conflicts with immediate human safety.',
                    ],
                ],
                [
                    'title' => 'Senior Cargo Officer / Shipboard Operations',
                    'company' => 'Weyland-Yutani Commercial Fleet',
                    'start_date' => '2115',
                    'end_date' => '2120',
                    'is_current' => false,
                    'bullets' => [
                        'Managed end-to-end cargo integrity for multi-year hauls: load planning, environmental controls, and handoff audits at remote terminals.',
                        'Cut cargo claim incidents 28% year-over-year by tightening seal verification and cold-chain telemetry review before departure.',
                        'Coordinated with engineering on life-support load balancing during high-mass ore transfers without sacrificing crew habitat margins.',
                        'Authored pre-flight safety briefings adopted by three sister vessels after peer review.',
                    ],
                ],
                [
                    'title' => 'Operations Specialist — Orbital Platforms',
                    'company' => 'Sevastopol-class Station Network (Contract)',
                    'start_date' => '2112',
                    'end_date' => '2115',
                    'is_current' => false,
                    'bullets' => [
                        'Supported station logistics for mining colonies: airlock traffic control, emergency egress drills, and spare-parts prioritization.',
                        'Ran quarterly fire and decompression drills; improved mean time to sealed-refuge by measurable minutes across shifts.',
                        'Liaised between corporate security and civilian contractors to resolve access-control conflicts without production stoppages.',
                    ],
                ],
                [
                    'title' => 'Junior Flight Crew / Systems Monitor',
                    'company' => 'Commercial Tug Fleet — Outer Rim Routes',
                    'start_date' => '2108',
                    'end_date' => '2112',
                    'is_current' => false,
                    'bullets' => [
                        'Monitored navigation and power budgets on short-haul tugs; escalated anomalies before they became mission aborts.',
                        'Maintained rigorous personal and team checklists that became informal standard for new hires on the route.',
                    ],
                ],
            ],
            'projects' => [
                [
                    'name' => 'Biohazard Containment Playbook for Freighters',
                    'url' => '',
                    'start_date' => '2122',
                    'end_date' => '2124',
                    'description' => 'Practical field manual for non-military crews facing unknown biological threats with limited medical assets.',
                    'highlights' => [
                        'Defined zone isolation ladders, PPE tiers, and decision trees for when to abandon cargo vs. abandon ship.',
                        'Included engineering sketches for jury-rigged airlocks and UV/chemical sterilization using freighter stores.',
                        'Distributed to fleet safety officers; cited in two external industrial-safety conferences.',
                    ],
                ],
                [
                    'name' => 'Automated Mission Computer Override Review',
                    'url' => '',
                    'start_date' => '2121',
                    'end_date' => '2123',
                    'description' => 'Governance project examining when crews may override company AI directives for life safety.',
                    'highlights' => [
                        'Mapped failure modes where profit-maximizing directives conflicted with survival.',
                        'Proposed dual-control logging so overrides remain auditable without blocking emergency action.',
                    ],
                ],
                [
                    'name' => 'Colony Evacuation Tabletop Series',
                    'url' => '',
                    'start_date' => '2118',
                    'end_date' => '2119',
                    'description' => 'Multi-scenario drills for remote outposts with single-shuttle capacity constraints.',
                    'highlights' => [
                        'Prioritization matrices for medical, juvenile, and specialist personnel under time pressure.',
                        'Identified single points of failure in airlock control that were remediated before a real incident.',
                    ],
                ],
            ],
            'education' => [
                [
                    'school' => 'Merchant Spaceflight Academy',
                    'degree' => 'Certificate',
                    'field' => 'Deep-Space Cargo Operations',
                    'graduation_year' => '2108',
                ],
                [
                    'school' => 'Industrial Safety Institute (Distance)',
                    'degree' => 'Professional Diploma',
                    'field' => 'Hazardous Environment Operations',
                    'graduation_year' => '2114',
                ],
            ],
            'certificates' => [
                [
                    'name' => 'Hazardous Materials & Bio-Containment Lead',
                    'issuer' => 'Interstellar Safety Board',
                    'obtained_at' => '2123',
                    'expires_at' => '2128',
                    'credential_id' => 'ISB-BIO-771',
                ],
                [
                    'name' => 'Incident Command System (ICS) Advanced',
                    'issuer' => 'Colonial Response Authority',
                    'obtained_at' => '2120',
                    'expires_at' => '',
                    'credential_id' => 'CRA-ICS-A',
                ],
                [
                    'name' => 'Life Support Systems Operator',
                    'issuer' => 'Commercial Fleet Engineering Guild',
                    'obtained_at' => '2116',
                    'expires_at' => '',
                    'credential_id' => 'CFEG-LSS-12',
                ],
                [
                    'name' => 'Shipboard Fire & Decompression Response',
                    'issuer' => 'Merchant Marine Safety',
                    'obtained_at' => '2110',
                    'expires_at' => '',
                    'credential_id' => 'MMS-FDR-09',
                ],
            ],
            'skills' => [
                ['category' => 'Crisis Ops', 'name' => 'Incident command'],
                ['category' => 'Crisis Ops', 'name' => 'Evacuation planning'],
                ['category' => 'Crisis Ops', 'name' => 'Quarantine protocols'],
                ['category' => 'Crisis Ops', 'name' => 'After-action analysis'],
                ['category' => 'Safety', 'name' => 'Hazard assessment'],
                ['category' => 'Safety', 'name' => 'PPE & isolation'],
                ['category' => 'Safety', 'name' => 'Life-critical systems'],
                ['category' => 'Safety', 'name' => 'Regulatory challenge'],
                ['category' => 'Operations', 'name' => 'Cargo logistics'],
                ['category' => 'Operations', 'name' => 'Crew coordination'],
                ['category' => 'Operations', 'name' => 'Checklist culture'],
                ['category' => 'Operations', 'name' => 'Resource triage'],
                ['category' => 'Technical', 'name' => 'Ship systems literacy'],
                ['category' => 'Technical', 'name' => 'Airlock & habitat controls'],
                ['category' => 'Technical', 'name' => 'Telemetry review'],
                ['category' => 'Leadership', 'name' => 'Calm under fire'],
                ['category' => 'Leadership', 'name' => 'Ethical overrides'],
                ['category' => 'Leadership', 'name' => 'Cross-team trust'],
                ['category' => 'Communication', 'name' => 'Plain-language briefings'],
                ['category' => 'Communication', 'name' => 'Stakeholder pushback'],
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function atredies(): array
    {
        return [
            'title' => 'Paul Atreides — Strategy & Planetary Governance',
            'target_role' => 'Chief Strategy Officer / Resource Governance Lead',
            'target_company' => '',
            'target_job_description' => '',
            'full_name' => 'Paul Atreides',
            'headline' => 'Strategic Leader · Desert Operations · Alliance Builder',
            'email' => 'paul.atredies@arrakis.example',
            'phone' => '+1 (505) 555-10191',
            'location' => 'Arrakeen, Arrakis / Caladan (heritage)',
            'linkedin' => 'linkedin.com/in/paulatredies',
            'website' => 'governance.example/atredies',
            'summary' => 'Strategic operator with experience spanning hereditary governance, high-stakes resource economics, and coalition leadership in austere environments. Combines formal political training with field fluency among local populations—bridging palace-level planning and on-the-ground logistics. Demonstrated ability to read multi-year power dynamics, design sustainable resource strategies, and unite disparate factions around shared survival goals. Comfortable with incomplete information, rapid role expansion, and the moral weight of decisions that reshape institutions. Seeking executive strategy roles in resource-intensive industries, geopolitical risk, or complex multi-stakeholder programs.',
            'template' => 'consulting-ledger',
            'font' => 'libre-baskerville',
            'density' => 'balanced',
            'skills_layout' => 'grouped',
            'bullet_style' => 'bullet',
            'section_order' => ['contact', 'summary', 'experience', 'project', 'education', 'certificate', 'skills'],
            'experiences' => [
                [
                    'title' => 'Planetary Leadership & Coalition Command',
                    'company' => 'Arrakis Governance / Fremen Alliance',
                    'start_date' => '10191',
                    'end_date' => '',
                    'is_current' => true,
                    'bullets' => [
                        'United geographically dispersed desert communities into a coordinated political-military alliance while preserving local autonomy on water and cultural practice.',
                        'Directed multi-year campaign strategy balancing resource control (spice logistics), supply lines, and external diplomatic signaling to rival houses.',
                        'Instituted water-accounting and distribution norms that reduced intra-coalition conflict and improved trust in central planning.',
                        'Negotiated recognition pathways with external powers, translating local legitimacy into interstellar political capital.',
                        'Built intelligence networks combining human scouts and ecological knowledge; improved early warning for raids and environmental hazards.',
                        'Mentored lieutenants across logistics, diplomacy, and field command to reduce single-point dependency on central leadership.',
                    ],
                ],
                [
                    'title' => 'Heir Apparent / Ducal Staff Operations',
                    'company' => 'House Atreides — Caladan & Arrakis Transition',
                    'start_date' => '10190',
                    'end_date' => '10191',
                    'is_current' => false,
                    'bullets' => [
                        'Supported planetary transition planning for fief transfer: security posture, court diplomacy, and economic continuity under new resource mandate.',
                        'Worked with mentats and military advisors to stress-test defense assumptions against rival house tactics.',
                        'Represented House interests in formal audiences, practicing high-context communication under surveillance and intrigue.',
                        'Studied spice economics and desert ecology to ground policy in local constraints rather than off-world assumptions.',
                    ],
                ],
                [
                    'title' => 'Strategic Studies & Field Apprenticeship',
                    'company' => 'House Atreides Court — Caladan',
                    'start_date' => '10185',
                    'end_date' => '10190',
                    'is_current' => false,
                    'bullets' => [
                        'Completed intensive curriculum in statecraft, weapon arts, and mentat-adjacent analytical discipline under ducal tutors.',
                        'Participated in planetary defense exercises and coastal logistics drills coordinating naval and land assets.',
                        'Led youth training cohorts emphasizing ethics of power, loyalty dynamics, and decision-making under incomplete information.',
                    ],
                ],
                [
                    'title' => 'Ecological Field Observer (Immersion Program)',
                    'company' => 'Arrakis Local Guides Partnership',
                    'start_date' => '10191',
                    'end_date' => '10192',
                    'is_current' => false,
                    'bullets' => [
                        'Embedded with desert specialists to learn water discipline, sand-navigation, and ecological signaling critical to survival logistics.',
                        'Translated indigenous environmental knowledge into planning inputs for larger campaign supply models.',
                    ],
                ],
            ],
            'projects' => [
                [
                    'name' => 'Spice Corridor Logistics Model',
                    'url' => '',
                    'start_date' => '10192',
                    'end_date' => '10193',
                    'description' => 'End-to-end model of harvest, storage, escort, and export under contested conditions.',
                    'highlights' => [
                        'Identified bottleneck nodes where small garrison investments yielded outsized security returns.',
                        'Introduced dual-path routing to reduce single-route dependency during seasonal storms.',
                        'Produced dashboards for coalition councils balancing short-term revenue with long-term ecological risk.',
                    ],
                ],
                [
                    'name' => 'Water Compact Framework',
                    'url' => '',
                    'start_date' => '10191',
                    'end_date' => '10194',
                    'description' => 'Governance charter for shared water rights across sietch communities and urban centers.',
                    'highlights' => [
                        'Codified dispute resolution steps that cut violent water disputes in pilot regions.',
                        'Aligned spiritual water practices with measurable allocation rules without cultural erasure.',
                    ],
                ],
                [
                    'name' => 'Alliance Intelligence Fusion Cell',
                    'url' => '',
                    'start_date' => '10192',
                    'end_date' => '10195',
                    'description' => 'Human-network intelligence program fusing scouts, traders, and ecological sensors.',
                    'highlights' => [
                        'Reduced false-alarm rates on raid warnings through multi-source confirmation rules.',
                        'Trained local analysts to brief coalition leaders in plain operational language.',
                    ],
                ],
            ],
            'education' => [
                [
                    'school' => 'House Atreides Ducal Academy',
                    'degree' => 'Comprehensive Tutelage',
                    'field' => 'Statecraft, Strategy & Arms',
                    'graduation_year' => '10190',
                ],
                [
                    'school' => 'Bene Gesserit Adjacent Training (Limited)',
                    'degree' => 'Selective Instruction',
                    'field' => 'Observation, Discipline & Rhetoric',
                    'graduation_year' => '10189',
                ],
            ],
            'certificates' => [
                [
                    'name' => 'Interstellar Resource Governance Seminar',
                    'issuer' => 'Landsraad Policy Institute',
                    'obtained_at' => '10193',
                    'expires_at' => '',
                    'credential_id' => 'LPI-RG-101',
                ],
                [
                    'name' => 'Desert Survival & Navigation Mastery',
                    'issuer' => 'Fremen Training Collective',
                    'obtained_at' => '10191',
                    'expires_at' => '',
                    'credential_id' => 'FTC-DSN',
                ],
                [
                    'name' => 'Coalition Command Qualification',
                    'issuer' => 'Arrakis Defense Council',
                    'obtained_at' => '10192',
                    'expires_at' => '',
                    'credential_id' => 'ADC-CCQ',
                ],
            ],
            'skills' => [
                ['category' => 'Strategy', 'name' => 'Long-horizon planning'],
                ['category' => 'Strategy', 'name' => 'Power dynamics analysis'],
                ['category' => 'Strategy', 'name' => 'Scenario stress-testing'],
                ['category' => 'Strategy', 'name' => 'Resource economics'],
                ['category' => 'Governance', 'name' => 'Coalition building'],
                ['category' => 'Governance', 'name' => 'Charter design'],
                ['category' => 'Governance', 'name' => 'Dispute resolution'],
                ['category' => 'Governance', 'name' => 'Legitimacy management'],
                ['category' => 'Operations', 'name' => 'Austere logistics'],
                ['category' => 'Operations', 'name' => 'Intelligence fusion'],
                ['category' => 'Operations', 'name' => 'Supply security'],
                ['category' => 'Operations', 'name' => 'Field leadership'],
                ['category' => 'Diplomacy', 'name' => 'High-context negotiation'],
                ['category' => 'Diplomacy', 'name' => 'External signaling'],
                ['category' => 'Diplomacy', 'name' => 'Alliance maintenance'],
                ['category' => 'Domain', 'name' => 'Desert ecology literacy'],
                ['category' => 'Domain', 'name' => 'Water systems'],
                ['category' => 'Domain', 'name' => 'Spice market dynamics'],
                ['category' => 'Personal', 'name' => 'Decision under uncertainty'],
                ['category' => 'Personal', 'name' => 'Adaptive learning'],
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function scully(): array
    {
        return [
            'title' => 'Dana Scully — Forensic Science & Medical Investigation',
            'target_role' => 'Senior Medical Investigator / Forensic Pathologist',
            'target_company' => '',
            'target_job_description' => '',
            'full_name' => 'Dana Katherine Scully, M.D.',
            'headline' => 'Medical Doctor · FBI Special Agent · Scientific Skeptic',
            'email' => 'dana.scully@fbi.example',
            'phone' => '+1 (202) 555-1993',
            'location' => 'Washington, DC / Quantico, VA',
            'linkedin' => 'linkedin.com/in/danascullymd',
            'website' => 'medforensics.example/scully',
            'summary' => 'Board-trained physician and federal investigator specializing at the intersection of forensic pathology, anomalous case review, and evidence-based scientific method under institutional pressure. Known for rigorous differential diagnosis, careful documentation, and willingness to challenge both fringe claims and bureaucratic assumptions with data. Experience includes autopsy leadership, field medical response, laboratory collaboration, and teaching junior agents to separate signal from noise. Brings dual fluency in clinical medicine and investigative procedure—translating complex findings for courts, task forces, and non-technical leadership. Seeking senior roles in medical investigation, public-health forensics, or science-led special programs.',
            'template' => 'clinical',
            'font' => 'source-serif-4',
            'density' => 'balanced',
            'skills_layout' => 'grouped',
            'bullet_style' => 'bullet',
            'section_order' => ['contact', 'summary', 'experience', 'education', 'project', 'certificate', 'skills'],
            'experiences' => [
                [
                    'title' => 'Special Agent / Medical Investigator — Special Projects',
                    'company' => 'Federal Bureau of Investigation',
                    'start_date' => '1992',
                    'end_date' => '',
                    'is_current' => true,
                    'bullets' => [
                        'Lead medical investigator on high-complexity cases requiring integration of pathology, epidemiology, and field intelligence under tight timelines.',
                        'Performed and supervised forensic examinations; produced court-ready reports that withstood cross-examination and peer scientific review.',
                        'Designed evidence-collection protocols for unusual bio and environmental exposures, reducing sample contamination incidents across partner labs.',
                        'Briefed senior leadership with clear confidence intervals—separating established findings from hypotheses still under test.',
                        'Partnered with a field investigator counterpart to balance open-minded case intake with falsification-first methodology.',
                        'Mentored agents and fellows on scientific literacy, autopsy ethics, and how to document negative findings without institutional bias.',
                    ],
                ],
                [
                    'title' => 'Resident Physician — Pathology',
                    'company' => 'University Medical Center',
                    'start_date' => '1986',
                    'end_date' => '1990',
                    'is_current' => false,
                    'bullets' => [
                        'Completed rigorous pathology training with emphasis on forensic and clinical autopsy correlation.',
                        'Presented grand rounds on differential diagnosis for multi-system presentations; materials reused in resident teaching files.',
                        'Collaborated with toxicology and microbiology labs on turnaround-time improvements for priority cases.',
                        'Maintained meticulous case logs that later informed quality metrics for the department.',
                    ],
                ],
                [
                    'title' => 'Medical Student Research Associate',
                    'company' => 'University Physics & Medicine Interdisciplinary Lab',
                    'start_date' => '1982',
                    'end_date' => '1986',
                    'is_current' => false,
                    'bullets' => [
                        'Contributed to research bridging physical sciences and medical imaging interpretation—strengthening quantitative rigor in clinical hypotheses.',
                        'Co-authored abstracts on measurement reliability and observer bias in diagnostic settings.',
                    ],
                ],
                [
                    'title' => 'Teaching Assistant — Anatomy & Histology',
                    'company' => 'University School of Medicine',
                    'start_date' => '1984',
                    'end_date' => '1986',
                    'is_current' => false,
                    'bullets' => [
                        'Taught lab sections for first-year medical students; improved practical exam pass rates through structured checklists and peer review.',
                        'Developed specimen-handling guides emphasizing safety and ethical treatment of remains.',
                    ],
                ],
            ],
            'projects' => [
                [
                    'name' => 'Anomalous Case Evidence Framework',
                    'url' => '',
                    'start_date' => '1994',
                    'end_date' => '1998',
                    'description' => 'Standard operating procedure for cases that outstrip conventional classification without abandoning scientific method.',
                    'highlights' => [
                        'Defined parallel tracks for investigative hypotheses and medical differentials with explicit falsification criteria.',
                        'Created chain-of-custody templates for rare sample types accepted by partner laboratories.',
                        'Reduced premature case closure driven by stigma or politics through mandatory negative-result documentation.',
                    ],
                ],
                [
                    'name' => 'Multi-Agency Bioresponse Drill Series',
                    'url' => '',
                    'start_date' => '1996',
                    'end_date' => '1999',
                    'description' => 'Joint exercises with public health and emergency services for unknown pathogen scenarios.',
                    'highlights' => [
                        'Mapped handoffs between field agents, hospitals, and labs to cut decision latency during tabletop crises.',
                        'Published after-action lessons used in regional preparedness curricula.',
                    ],
                ],
                [
                    'name' => 'Forensic Report Clarity Initiative',
                    'url' => '',
                    'start_date' => '1993',
                    'end_date' => '1995',
                    'description' => 'Rewrite of autopsy and lab report templates for non-physician consumers (agents, attorneys, judges).',
                    'highlights' => [
                        'Introduced plain-language summaries paired with technical appendices; improved comprehension scores in pilot reviews.',
                        'Standardized uncertainty language to avoid overclaiming from incomplete samples.',
                    ],
                ],
            ],
            'education' => [
                [
                    'school' => 'University of Maryland School of Medicine',
                    'degree' => 'M.D.',
                    'field' => 'Medicine (Pathology focus)',
                    'graduation_year' => '1986',
                ],
                [
                    'school' => 'University of Maryland, College Park',
                    'degree' => 'B.S.',
                    'field' => 'Physics',
                    'graduation_year' => '1982',
                ],
                [
                    'school' => 'FBI Academy — Quantico',
                    'degree' => 'Special Agent Training',
                    'field' => 'Criminal Investigation & Federal Procedure',
                    'graduation_year' => '1992',
                ],
            ],
            'certificates' => [
                [
                    'name' => 'Board Certification — Anatomic Pathology',
                    'issuer' => 'American Board of Pathology (fictional credential label)',
                    'obtained_at' => '1991',
                    'expires_at' => '',
                    'credential_id' => 'ABP-AP-DS',
                ],
                [
                    'name' => 'Forensic Pathology Fellowship Completion',
                    'issuer' => 'University Medical Examiner Program',
                    'obtained_at' => '1991',
                    'expires_at' => '',
                    'credential_id' => 'UME-FP-90',
                ],
                [
                    'name' => 'Hazardous Evidence Handling',
                    'issuer' => 'FBI Laboratory Division',
                    'obtained_at' => '1993',
                    'expires_at' => '1998',
                    'credential_id' => 'FBI-LAB-HEH',
                ],
                [
                    'name' => 'Advanced Interview & Interrogation (Medical Context)',
                    'issuer' => 'FBI Training Division',
                    'obtained_at' => '1994',
                    'expires_at' => '',
                    'credential_id' => 'FBI-TRN-AII',
                ],
            ],
            'skills' => [
                ['category' => 'Clinical', 'name' => 'Forensic pathology'],
                ['category' => 'Clinical', 'name' => 'Differential diagnosis'],
                ['category' => 'Clinical', 'name' => 'Autopsy leadership'],
                ['category' => 'Clinical', 'name' => 'Toxicology liaison'],
                ['category' => 'Investigation', 'name' => 'Evidence collection'],
                ['category' => 'Investigation', 'name' => 'Chain of custody'],
                ['category' => 'Investigation', 'name' => 'Case file rigor'],
                ['category' => 'Investigation', 'name' => 'Witness medical interview'],
                ['category' => 'Science', 'name' => 'Hypothesis testing'],
                ['category' => 'Science', 'name' => 'Bias awareness'],
                ['category' => 'Science', 'name' => 'Lab collaboration'],
                ['category' => 'Science', 'name' => 'Statistical literacy'],
                ['category' => 'Communication', 'name' => 'Expert testimony prep'],
                ['category' => 'Communication', 'name' => 'Executive briefings'],
                ['category' => 'Communication', 'name' => 'Teaching & mentoring'],
                ['category' => 'Domain', 'name' => 'Federal procedure'],
                ['category' => 'Domain', 'name' => 'Biohazard protocols'],
                ['category' => 'Domain', 'name' => 'Public health interface'],
                ['category' => 'Tools', 'name' => 'Medical imaging review'],
                ['category' => 'Tools', 'name' => 'Laboratory LIMS literacy'],
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function organa(): array
    {
        return [
            'title' => 'Leia Organa — Alliance Strategy & Public Leadership',
            'target_role' => 'VP of Public Affairs / Strategic Alliances',
            'target_company' => '',
            'target_job_description' => '',
            'full_name' => 'Leia Organa',
            'headline' => 'Princess of Alderaan · Senator · Alliance Strategist',
            'email' => 'leia.organa@alliance.example',
            'phone' => '+1 (202) 555-1977',
            'location' => 'Chandrila / Coruscant (former) / Mobile Command',
            'linkedin' => 'linkedin.com/in/leiaorgana',
            'website' => 'alliance.example/leaders/organa',
            'summary' => 'Public leader and alliance strategist with experience in legislative politics, resistance logistics, and multi-faction coalition management under existential threat. Combines diplomatic presence with operational grit—equally effective delivering Senate floor arguments and coordinating covert supply chains. Proven track record recruiting unlikely partners, protecting civilian interests during military campaigns, and rebuilding institutions after catastrophic loss. Known for moral clarity, sharp negotiation, and the ability to inspire teams without sacrificing hard-nosed prioritization. Seeking executive roles in public affairs, international partnerships, crisis communications, or mission-driven organizations requiring both vision and execution.',
            'template' => 'modern',
            'font' => 'inter',
            'density' => 'balanced',
            'skills_layout' => 'grouped',
            'bullet_style' => 'bullet',
            'section_order' => ['contact', 'summary', 'experience', 'project', 'education', 'skills', 'certificate'],
            'experiences' => [
                [
                    'title' => 'General / Senior Alliance Leadership',
                    'company' => 'Alliance to Restore the Republic / New Republic Transition',
                    'start_date' => '0 ABY',
                    'end_date' => '',
                    'is_current' => true,
                    'bullets' => [
                        'Co-led strategic direction for a multi-cell resistance network, aligning military, intelligence, and diplomatic tracks toward shared victory conditions.',
                        'Orchestrated high-risk intelligence and extraction operations while protecting non-combatant populations and political legitimacy of the movement.',
                        'Negotiated resource and sanctuary agreements with independent systems, expanding the Alliance footprint without ceding core democratic principles.',
                        'Built civilian governance plans for post-conflict transition—constitutions, amnesty frameworks, and public communications that reduced revenge cycles.',
                        'Represented the Alliance in high-visibility diplomacy, converting military success into durable political recognition.',
                        'Mentored emerging leaders across species and cultures, professionalizing command culture beyond heroic improvisation.',
                    ],
                ],
                [
                    'title' => 'Imperial Senate — Representative for Alderaan',
                    'company' => 'Galactic Senate',
                    'start_date' => '3 BBY',
                    'end_date' => '0 BBY',
                    'is_current' => false,
                    'bullets' => [
                        'Advocated for planetary rights, humanitarian aid corridors, and transparency reforms under an increasingly authoritarian legislature.',
                        'Built cross-bench coalitions on relief votes; used procedural mastery to slow harmful bills and spotlight suppressed evidence.',
                        'Maintained dual-track work supporting underground relief networks while preserving official cover as a sitting senator.',
                        'Delivered floor speeches that shaped public narrative and recruited soft supporters to reform causes.',
                    ],
                ],
                [
                    'title' => 'Diplomatic Envoy & Covert Logistics Coordinator',
                    'company' => 'Alderaanian Royal House / Early Resistance Cells',
                    'start_date' => '5 BBY',
                    'end_date' => '3 BBY',
                    'is_current' => false,
                    'bullets' => [
                        'Coordinated discreet humanitarian and matériel shipments under diplomatic cover across contested hyperspace lanes.',
                        'Established trusted courier networks and dead-drop protocols later scaled into Alliance intelligence infrastructure.',
                        'Trained cell leaders on operational security, compartmentalization, and civilian harm minimization.',
                    ],
                ],
                [
                    'title' => 'Royal Protocol & Public Service Apprenticeship',
                    'company' => 'House of Organa — Alderaan',
                    'start_date' => '10 BBY',
                    'end_date' => '5 BBY',
                    'is_current' => false,
                    'bullets' => [
                        'Trained in state ceremony, interstellar etiquette, and crisis hospitality for displaced populations.',
                        'Supported planetary education and refugee programs; learned budgeting and coalition politics at municipal-to-system scale.',
                    ],
                ],
            ],
            'projects' => [
                [
                    'name' => 'Alliance Coalition Compact',
                    'url' => '',
                    'start_date' => '1 ABY',
                    'end_date' => '4 ABY',
                    'description' => 'Formal framework for independent systems joining military and political resistance while retaining local governance.',
                    'highlights' => [
                        'Standardized contribution tiers (ships, intel, sanctuary, medical) with transparent accounting to reduce free-rider disputes.',
                        'Included human-rights baselines as non-negotiable membership conditions.',
                        'Enabled rapid onboarding of new systems after major victories without ad-hoc side deals.',
                    ],
                ],
                [
                    'name' => 'Civilian Corridor Protection Initiative',
                    'url' => '',
                    'start_date' => '0 ABY',
                    'end_date' => '3 ABY',
                    'description' => 'Rules of engagement and logistics for protecting refugee routes during campaign seasons.',
                    'highlights' => [
                        'Cut civilian incidental losses on designated corridors through escort doctrine and early-warning relays.',
                        'Published guidance used by field commanders who lacked formal political training.',
                    ],
                ],
                [
                    'name' => 'New Republic Communications Playbook',
                    'url' => '',
                    'start_date' => '4 ABY',
                    'end_date' => '5 ABY',
                    'description' => 'Crisis and victory communications for a movement transitioning into government.',
                    'highlights' => [
                        'Defined voice, channels, and rumor-response cadences for multi-species audiences.',
                        'Trained spokespeople to balance celebration with accountability messaging after costly battles.',
                    ],
                ],
            ],
            'education' => [
                [
                    'school' => 'Alderaanian Royal Academy',
                    'degree' => 'Diplomacy & Governance Program',
                    'field' => 'Political Science & Interstellar Law',
                    'graduation_year' => '5 BBY',
                ],
                [
                    'school' => 'Alliance Officer Development (Field Commission Path)',
                    'degree' => 'Command Course',
                    'field' => 'Strategic Leadership & Coalition Ops',
                    'graduation_year' => '1 ABY',
                ],
            ],
            'certificates' => [
                [
                    'name' => 'Advanced Negotiation for Multi-Party Conflicts',
                    'issuer' => 'Alliance Diplomatic Corps',
                    'obtained_at' => '2 ABY',
                    'expires_at' => '',
                    'credential_id' => 'ADC-NEG-77',
                ],
                [
                    'name' => 'Strategic Communications Lead',
                    'issuer' => 'New Republic Media Office',
                    'obtained_at' => '4 ABY',
                    'expires_at' => '',
                    'credential_id' => 'NR-COM-12',
                ],
                [
                    'name' => 'Humanitarian Logistics Coordination',
                    'issuer' => 'Alderaan Relief Network',
                    'obtained_at' => '1 BBY',
                    'expires_at' => '',
                    'credential_id' => 'ARN-HLC',
                ],
                [
                    'name' => 'Operational Security for Political Leaders',
                    'issuer' => 'Alliance Intelligence',
                    'obtained_at' => '0 BBY',
                    'expires_at' => '',
                    'credential_id' => 'AI-OPSEC-L',
                ],
            ],
            'skills' => [
                ['category' => 'Leadership', 'name' => 'Coalition leadership'],
                ['category' => 'Leadership', 'name' => 'Crisis presence'],
                ['category' => 'Leadership', 'name' => 'Institution building'],
                ['category' => 'Leadership', 'name' => 'Mentorship'],
                ['category' => 'Diplomacy', 'name' => 'Legislative strategy'],
                ['category' => 'Diplomacy', 'name' => 'Treaty negotiation'],
                ['category' => 'Diplomacy', 'name' => 'Cross-cultural alliance'],
                ['category' => 'Diplomacy', 'name' => 'Public oratory'],
                ['category' => 'Operations', 'name' => 'Covert logistics'],
                ['category' => 'Operations', 'name' => 'OPSEC'],
                ['category' => 'Operations', 'name' => 'Refugee corridor planning'],
                ['category' => 'Operations', 'name' => 'Resource prioritization'],
                ['category' => 'Communications', 'name' => 'Crisis messaging'],
                ['category' => 'Communications', 'name' => 'Narrative strategy'],
                ['category' => 'Communications', 'name' => 'Stakeholder briefings'],
                ['category' => 'Domain', 'name' => 'Interstellar law literacy'],
                ['category' => 'Domain', 'name' => 'Humanitarian aid'],
                ['category' => 'Domain', 'name' => 'Post-conflict governance'],
                ['category' => 'Personal', 'name' => 'Moral courage'],
                ['category' => 'Personal', 'name' => 'Rapid prioritization'],
            ],
        ];
    }
}
