<?php

namespace Database\Seeders;

use App\Models\Resume;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class TestResumesSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::updateOrCreate(
            ['email' => 'rmethodm@outlook.com'],
            [
                'name' => 'Richard Method',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
            ]
        );

        $resumes = [
            [
                'name' => 'Senior Software Engineer',
                'template' => 'classic',
                'summary' => 'Experienced software engineer with 10+ years building scalable web applications and distributed systems. Passionate about clean code and mentoring junior developers.',
                'contact' => ['email' => 'richard@example.com', 'phone' => '555-0101', 'location' => 'San Francisco, CA', 'linkedin' => 'linkedin.com/in/richardmethod'],
                'experience' => [
                    ['id' => Str::uuid(), 'company' => 'Acme Corp', 'title' => 'Senior Software Engineer', 'start_date' => 'Mar 2020', 'end_date' => 'Present', 'current' => true,  'bullets' => "Led migration of monolith to microservices, reducing deploy time by 60%\nMentored a team of 5 junior engineers\nDesigned RESTful APIs serving 2M+ daily requests"],
                    ['id' => Str::uuid(), 'company' => 'TechStart Inc',  'title' => 'Software Engineer',        'start_date' => 'Jun 2016', 'end_date' => 'Feb 2020', 'current' => false, 'bullets' => "Built real-time chat feature using WebSockets\nReduced page load time by 40% via caching strategies\nWrote unit and integration tests achieving 90% coverage"],
                    ['id' => Str::uuid(), 'company' => 'DevShop LLC',    'title' => 'Junior Developer',          'start_date' => 'Jan 2014', 'end_date' => 'May 2016', 'current' => false, 'bullets' => "Developed internal CRM tool used by 200+ employees\nMaintained and extended legacy PHP codebase"],
                ],
                'education' => [
                    ['id' => Str::uuid(), 'school' => 'UC Berkeley', 'degree' => 'B.S.', 'field' => 'Computer Science', 'grad_year' => '2014'],
                ],
                'skills' => ['PHP', 'Laravel', 'React', 'TypeScript', 'PostgreSQL', 'Docker', 'AWS'],
                'certifications' => [['id' => Str::uuid(), 'name' => 'AWS Certified Solutions Architect', 'issuer' => 'Amazon', 'date' => '2022-05'], ['id' => Str::uuid(), 'name' => 'Google Cloud Professional', 'issuer' => 'Google', 'date' => '2021-11']],
            ],
            [
                'name' => 'Product Manager',
                'template' => 'modern',
                'summary' => 'Results-driven product manager with 8 years of experience launching B2B SaaS products. Strong background in user research and data-driven roadmap prioritization.',
                'contact' => ['email' => 'richard@example.com', 'phone' => '555-0102', 'location' => 'Austin, TX', 'linkedin' => 'linkedin.com/in/richardmethod'],
                'experience' => [
                    ['id' => Str::uuid(), 'company' => 'SaaS Giant',   'title' => 'Senior Product Manager', 'start_date' => 'Apr 2019', 'end_date' => 'Present',  'current' => true,  'bullets' => "Owned roadmap for analytics product with \$12M ARR\nReduced churn by 18% through targeted onboarding improvements\nCollaborated with engineering and design on 4 major feature launches"],
                    ['id' => Str::uuid(), 'company' => 'Launchpad Co', 'title' => 'Product Manager',        'start_date' => 'Jul 2015', 'end_date' => 'Mar 2019', 'current' => false, 'bullets' => "Grew DAU from 50K to 400K in 2 years\nConducted 100+ user interviews to inform product direction\nDefined and tracked OKRs across 3 product squads"],
                ],
                'education' => [
                    ['id' => Str::uuid(), 'school' => 'University of Texas', 'degree' => 'MBA',   'field' => 'Business Administration', 'grad_year' => '2015'],
                    ['id' => Str::uuid(), 'school' => 'UT Austin',           'degree' => 'B.A.',  'field' => 'Economics',               'grad_year' => '2013'],
                ],
                'skills' => ['Roadmap Planning', 'Jira', 'SQL', 'User Research', 'A/B Testing', 'Figma', 'Tableau'],
                'certifications' => [['id' => Str::uuid(), 'name' => 'Certified Scrum Product Owner', 'issuer' => 'Scrum Alliance', 'date' => '2020-03']],
            ],
            [
                'name' => 'Data Scientist',
                'template' => 'minimal',
                'summary' => 'Data scientist with expertise in machine learning, NLP, and statistical modeling. Published researcher with experience delivering ML solutions in production.',
                'contact' => ['email' => 'richard@example.com', 'phone' => '555-0103', 'location' => 'Seattle, WA', 'linkedin' => 'linkedin.com/in/richardmethod'],
                'experience' => [
                    ['id' => Str::uuid(), 'company' => 'DataCo Analytics', 'title' => 'Senior Data Scientist', 'start_date' => 'Jan 2021', 'end_date' => 'Present',  'current' => true,  'bullets' => "Built NLP pipeline processing 500K+ documents daily\nImproved recommendation model CTR by 22%\nLed data science guild of 8 members"],
                    ['id' => Str::uuid(), 'company' => 'Research Labs',    'title' => 'Data Scientist',         'start_date' => 'Jun 2018', 'end_date' => 'Dec 2020', 'current' => false, 'bullets' => "Published 2 papers on deep learning for text classification\nReduced model inference latency by 35% via quantization\nDeveloped internal AutoML tooling used across 4 teams"],
                ],
                'education' => [
                    ['id' => Str::uuid(), 'school' => 'University of Washington', 'degree' => 'M.S.', 'field' => 'Data Science', 'grad_year' => '2018'],
                    ['id' => Str::uuid(), 'school' => 'Oregon State University',  'degree' => 'B.S.', 'field' => 'Mathematics',  'grad_year' => '2016'],
                ],
                'skills' => ['Python', 'TensorFlow', 'PyTorch', 'SQL', 'Spark', 'R', 'Scikit-learn'],
                'certifications' => [['id' => Str::uuid(), 'name' => 'TensorFlow Developer Certificate', 'issuer' => 'Google', 'date' => '2022-08'], ['id' => Str::uuid(), 'name' => 'Databricks Certified Associate', 'issuer' => 'Databricks', 'date' => '2023-01']],
            ],
            [
                'name' => 'UX Designer',
                'template' => 'modern',
                'summary' => 'Creative UX designer with 7 years designing mobile and web products used by millions. Expert in design systems, accessibility, and user testing.',
                'contact' => ['email' => 'richard@example.com', 'phone' => '555-0104', 'location' => 'New York, NY', 'linkedin' => 'linkedin.com/in/richardmethod'],
                'experience' => [
                    ['id' => Str::uuid(), 'company' => 'DesignHub',   'title' => 'Lead UX Designer', 'start_date' => 'Feb 2020', 'end_date' => 'Present',  'current' => true,  'bullets' => "Redesigned onboarding flow, increasing activation rate by 31%\nBuilt and maintained company-wide design system with 200+ components\nRan weekly usability testing sessions with 10–15 participants"],
                    ['id' => Str::uuid(), 'company' => 'Pixel Agency', 'title' => 'UX Designer',      'start_date' => 'Aug 2016', 'end_date' => 'Jan 2020', 'current' => false, 'bullets' => "Designed mobile apps for 12 clients across fintech and healthcare\nIntroduced accessibility auditing process, achieving WCAG 2.1 AA compliance\nCollaborated with 6 cross-functional product teams"],
                ],
                'education' => [
                    ['id' => Str::uuid(), 'school' => 'Parsons School of Design', 'degree' => 'B.F.A.', 'field' => 'Communication Design', 'grad_year' => '2016'],
                ],
                'skills' => ['Figma', 'Sketch', 'Prototyping', 'User Research', 'Accessibility', 'Design Systems', 'HTML/CSS'],
                'certifications' => [['id' => Str::uuid(), 'name' => 'Nielsen Norman Group UX Certification', 'issuer' => 'NN/g', 'date' => '2021-06']],
            ],
            [
                'name' => 'DevOps Engineer',
                'template' => 'classic',
                'summary' => 'DevOps engineer with deep expertise in CI/CD pipelines, container orchestration, and cloud infrastructure. Passionate about reliability and automation.',
                'contact' => ['email' => 'richard@example.com', 'phone' => '555-0105', 'location' => 'Denver, CO', 'linkedin' => 'linkedin.com/in/richardmethod'],
                'experience' => [
                    ['id' => Str::uuid(), 'company' => 'CloudOps Inc', 'title' => 'Senior DevOps Engineer', 'start_date' => 'May 2019', 'end_date' => 'Present',  'current' => true,  'bullets' => "Reduced deployment frequency from weekly to 20+ times per day\nManaged Kubernetes clusters serving 500K+ concurrent users\nCut infrastructure costs by 30% via reserved instance optimization"],
                    ['id' => Str::uuid(), 'company' => 'BuildFast Ltd', 'title' => 'DevOps Engineer',        'start_date' => 'Mar 2016', 'end_date' => 'Apr 2019', 'current' => false, 'bullets' => "Built CI/CD pipelines with Jenkins and GitHub Actions\nAutomated infrastructure provisioning with Terraform\nImplemented observability stack with Prometheus and Grafana"],
                ],
                'education' => [
                    ['id' => Str::uuid(), 'school' => 'Colorado State University', 'degree' => 'B.S.', 'field' => 'Information Technology', 'grad_year' => '2016'],
                ],
                'skills' => ['Kubernetes', 'Docker', 'Terraform', 'AWS', 'GitHub Actions', 'Prometheus', 'Linux'],
                'certifications' => [['id' => Str::uuid(), 'name' => 'Certified Kubernetes Administrator', 'issuer' => 'CNCF', 'date' => '2021-09'], ['id' => Str::uuid(), 'name' => 'AWS DevOps Professional', 'issuer' => 'Amazon', 'date' => '2022-03']],
            ],
            [
                'name' => 'Marketing Manager',
                'template' => 'modern',
                'summary' => 'Growth-focused marketing manager with 9 years in B2C and B2B marketing. Proven track record in demand generation, brand strategy, and building high-performing teams.',
                'contact' => ['email' => 'richard@example.com', 'phone' => '555-0106', 'location' => 'Chicago, IL', 'linkedin' => 'linkedin.com/in/richardmethod'],
                'experience' => [
                    ['id' => Str::uuid(), 'company' => 'BrandForce', 'title' => 'Marketing Manager',          'start_date' => 'Sep 2018', 'end_date' => 'Present',  'current' => true,  'bullets' => "Grew organic traffic by 180% in 18 months through content strategy\nManaged \$2M annual paid media budget across Google, Meta, and LinkedIn\nLed rebrand initiative that improved NPS by 14 points"],
                    ['id' => Str::uuid(), 'company' => 'GrowthCo',   'title' => 'Digital Marketing Specialist', 'start_date' => 'Jan 2015', 'end_date' => 'Aug 2018', 'current' => false, 'bullets' => "Launched email drip campaigns generating \$800K in pipeline\nManaged SEO strategy achieving top-3 rankings for 50+ keywords\nBuilt reporting dashboards in HubSpot and Google Analytics"],
                ],
                'education' => [
                    ['id' => Str::uuid(), 'school' => 'Northwestern University', 'degree' => 'B.S.', 'field' => 'Marketing', 'grad_year' => '2015'],
                ],
                'skills' => ['SEO/SEM', 'HubSpot', 'Google Analytics', 'Content Strategy', 'Paid Media', 'Email Marketing', 'Salesforce'],
                'certifications' => [['id' => Str::uuid(), 'name' => 'Google Ads Certification', 'issuer' => 'Google', 'date' => '2023-02'], ['id' => Str::uuid(), 'name' => 'HubSpot Marketing Certified', 'issuer' => 'HubSpot', 'date' => '2022-07']],
            ],
            [
                'name' => 'Cybersecurity Analyst',
                'template' => 'classic',
                'summary' => 'Cybersecurity analyst with 6 years defending enterprise infrastructure. Specialist in threat detection, incident response, and security architecture.',
                'contact' => ['email' => 'richard@example.com', 'phone' => '555-0107', 'location' => 'Washington, DC', 'linkedin' => 'linkedin.com/in/richardmethod'],
                'experience' => [
                    ['id' => Str::uuid(), 'company' => 'SecureNet',     'title' => 'Senior Security Analyst', 'start_date' => 'Jul 2020', 'end_date' => 'Present',  'current' => true,  'bullets' => "Led incident response for 3 major ransomware events, zero data loss\nBuilt SIEM correlation rules reducing false positives by 55%\nConducted red team exercises across 8 business units"],
                    ['id' => Str::uuid(), 'company' => 'FinanceGuard',  'title' => 'Security Analyst',        'start_date' => 'Feb 2017', 'end_date' => 'Jun 2020', 'current' => false, 'bullets' => "Monitored SOC alerts and triaged 200+ incidents monthly\nImplemented DLP policies protecting 10TB+ of sensitive data\nAuthored security awareness training completed by 1,200 employees"],
                ],
                'education' => [
                    ['id' => Str::uuid(), 'school' => 'George Mason University', 'degree' => 'B.S.', 'field' => 'Cybersecurity', 'grad_year' => '2017'],
                ],
                'skills' => ['SIEM/Splunk', 'Penetration Testing', 'Network Security', 'Incident Response', 'Python', 'Wireshark', 'NIST Framework'],
                'certifications' => [['id' => Str::uuid(), 'name' => 'CISSP', 'issuer' => 'ISC2', 'date' => '2021-04'], ['id' => Str::uuid(), 'name' => 'CEH', 'issuer' => 'EC-Council', 'date' => '2019-11']],
            ],
            [
                'name' => 'Financial Analyst',
                'template' => 'minimal',
                'summary' => 'Detail-oriented financial analyst with 5 years in corporate finance and investment analysis. Skilled in financial modeling, forecasting, and communicating insights to C-suite.',
                'contact' => ['email' => 'richard@example.com', 'phone' => '555-0108', 'location' => 'New York, NY', 'linkedin' => 'linkedin.com/in/richardmethod'],
                'experience' => [
                    ['id' => Str::uuid(), 'company' => 'Capital Advisors',  'title' => 'Financial Analyst',  'start_date' => 'Jan 2021', 'end_date' => 'Present',  'current' => true,  'bullets' => "Built 3-statement financial models for 15+ portfolio companies\nPrepared quarterly board presentations for \$500M+ fund\nLed due diligence process on 6 M&A transactions"],
                    ['id' => Str::uuid(), 'company' => 'Big4 Accounting',   'title' => 'Associate Analyst',  'start_date' => 'Jul 2018', 'end_date' => 'Dec 2020', 'current' => false, 'bullets' => "Supported audit engagements for Fortune 500 clients\nDeveloped Excel automation reducing report prep time by 50%\nMaintained financial models for 12 active client engagements"],
                ],
                'education' => [
                    ['id' => Str::uuid(), 'school' => 'NYU Stern', 'degree' => 'B.S.', 'field' => 'Finance', 'grad_year' => '2018'],
                ],
                'skills' => ['Financial Modeling', 'Excel/VBA', 'SQL', 'Bloomberg Terminal', 'PowerPoint', 'Tableau', 'Python'],
                'certifications' => [['id' => Str::uuid(), 'name' => 'CFA Level II', 'issuer' => 'CFA Institute', 'date' => '2023-08'], ['id' => Str::uuid(), 'name' => 'Bloomberg Market Concepts', 'issuer' => 'Bloomberg', 'date' => '2021-03']],
            ],
            [
                'name' => 'Registered Nurse',
                'template' => 'classic',
                'summary' => 'Compassionate registered nurse with 8 years in acute care and critical care settings. Committed to patient advocacy and evidence-based practice.',
                'contact' => ['email' => 'richard@example.com', 'phone' => '555-0109', 'location' => 'Houston, TX', 'linkedin' => 'linkedin.com/in/richardmethod'],
                'experience' => [
                    ['id' => Str::uuid(), 'company' => 'Houston Medical Center', 'title' => 'Senior RN, ICU',       'start_date' => 'Mar 2019', 'end_date' => 'Present',  'current' => true,  'bullets' => "Provided critical care for 4–6 patients per shift in 24-bed ICU\nPrecepted 8 new graduate nurses over 3 years\nLed rapid response team, achieving 95% survival rate"],
                    ['id' => Str::uuid(), 'company' => 'Memorial Hospital',      'title' => 'Staff Nurse, Med-Surg', 'start_date' => 'Jun 2015', 'end_date' => 'Feb 2019', 'current' => false, 'bullets' => "Managed caseload of 6–8 patients per shift\nParticipated in quality improvement initiative reducing HAIs by 30%\nCollaborated with multidisciplinary care teams on discharge planning"],
                ],
                'education' => [
                    ['id' => Str::uuid(), 'school' => 'University of Houston', 'degree' => 'B.S.N.', 'field' => 'Nursing', 'grad_year' => '2015'],
                ],
                'skills' => ['Critical Care', 'IV Therapy', 'Patient Education', 'Epic EHR', 'ACLS/BLS', 'Wound Care', 'Team Leadership'],
                'certifications' => [['id' => Str::uuid(), 'name' => 'CCRN', 'issuer' => 'AACN', 'date' => '2020-05'], ['id' => Str::uuid(), 'name' => 'BLS Instructor', 'issuer' => 'American Heart Association', 'date' => '2022-01']],
            ],
            [
                'name' => 'Mechanical Engineer',
                'template' => 'modern',
                'summary' => 'Mechanical engineer with 7 years in product design and manufacturing. Expert in CAD, FEA simulation, and driving designs from concept to production.',
                'contact' => ['email' => 'richard@example.com', 'phone' => '555-0110', 'location' => 'Detroit, MI', 'linkedin' => 'linkedin.com/in/richardmethod'],
                'experience' => [
                    ['id' => Str::uuid(), 'company' => 'AutoParts Manufacturing', 'title' => 'Senior Mechanical Engineer', 'start_date' => 'Jun 2020', 'end_date' => 'Present',  'current' => true,  'bullets' => "Designed lightweight chassis component reducing vehicle weight by 8%\nLed DFMEAs for 5 new product lines\nManaged cross-functional team of 7 through NPI process"],
                    ['id' => Str::uuid(), 'company' => 'Precision Dynamics',      'title' => 'Mechanical Engineer',        'start_date' => 'Jan 2017', 'end_date' => 'May 2020', 'current' => false, 'bullets' => "Created SolidWorks models and drawings for 30+ custom components\nPerformed FEA simulations reducing physical prototype cycles by 40%\nCollaborated with suppliers to resolve 20+ quality escapes"],
                ],
                'education' => [
                    ['id' => Str::uuid(), 'school' => 'University of Michigan', 'degree' => 'B.S.', 'field' => 'Mechanical Engineering', 'grad_year' => '2017'],
                ],
                'skills' => ['SolidWorks', 'ANSYS FEA', 'GD&T', 'AutoCAD', 'DFMEA', 'Lean Manufacturing', 'MATLAB'],
                'certifications' => [['id' => Str::uuid(), 'name' => 'Professional Engineer (PE)', 'issuer' => 'NCEES', 'date' => '2021-10'], ['id' => Str::uuid(), 'name' => 'Six Sigma Green Belt', 'issuer' => 'ASQ', 'date' => '2022-04']],
            ],
            [
                'name' => 'Graphic Designer',
                'template' => 'minimal',
                'summary' => 'Versatile graphic designer with 6 years creating brand identities, marketing materials, and digital content. Strong portfolio spanning print, digital, and motion graphics.',
                'contact' => ['email' => 'richard@example.com', 'phone' => '555-0111', 'location' => 'Los Angeles, CA', 'linkedin' => 'linkedin.com/in/richardmethod'],
                'experience' => [
                    ['id' => Str::uuid(), 'company' => 'Creative Studio X', 'title' => 'Senior Graphic Designer', 'start_date' => 'Feb 2021', 'end_date' => 'Present',  'current' => true,  'bullets' => "Led brand identity projects for 10+ clients with \$100K+ budgets\nDesigned marketing campaigns generating 3M+ social impressions\nManaged junior designer and oversaw quality of all deliverables"],
                    ['id' => Str::uuid(), 'company' => 'AdAgency Plus',     'title' => 'Graphic Designer',        'start_date' => 'Aug 2017', 'end_date' => 'Jan 2021', 'current' => false, 'bullets' => "Produced 500+ design assets annually across print and digital channels\nDeveloped visual identity systems for 5 brand launches\nIntroduced Figma workflows reducing handoff time by 25%"],
                ],
                'education' => [
                    ['id' => Str::uuid(), 'school' => 'Art Center College of Design', 'degree' => 'B.F.A.', 'field' => 'Graphic Design', 'grad_year' => '2017'],
                ],
                'skills' => ['Adobe Creative Suite', 'Figma', 'After Effects', 'Typography', 'Brand Identity', 'Motion Graphics', 'Print Production'],
                'certifications' => [['id' => Str::uuid(), 'name' => 'Adobe Certified Professional', 'issuer' => 'Adobe', 'date' => '2020-09']],
            ],
            [
                'name' => 'Project Manager — Construction',
                'template' => 'classic',
                'summary' => 'Licensed project manager with 12 years overseeing commercial construction projects up to $50M. Expert in scheduling, budgeting, and contractor management.',
                'contact' => ['email' => 'richard@example.com', 'phone' => '555-0112', 'location' => 'Phoenix, AZ', 'linkedin' => 'linkedin.com/in/richardmethod'],
                'experience' => [
                    ['id' => Str::uuid(), 'company' => 'BuildRight Construction', 'title' => 'Senior Project Manager', 'start_date' => 'Apr 2017', 'end_date' => 'Present',  'current' => true,  'bullets' => "Delivered \$35M mixed-use development on time and under budget\nManaged teams of 80+ subcontractors across concurrent projects\nImplemented Procore reducing RFI response time by 45%"],
                    ['id' => Str::uuid(), 'company' => 'CoreConstruct',           'title' => 'Project Manager',        'start_date' => 'Jan 2012', 'end_date' => 'Mar 2017', 'current' => false, 'bullets' => "Oversaw 15 commercial tenant improvement projects totaling \$18M\nMaintained safety record of zero lost-time incidents over 5 years\nNegotiated subcontract savings averaging 12% below estimate"],
                ],
                'education' => [
                    ['id' => Str::uuid(), 'school' => 'Arizona State University', 'degree' => 'B.S.', 'field' => 'Construction Management', 'grad_year' => '2012'],
                ],
                'skills' => ['Procore', 'MS Project', 'Primavera P6', 'Budgeting', 'Contract Negotiation', 'Safety Management', 'AutoCAD'],
                'certifications' => [['id' => Str::uuid(), 'name' => 'PMP', 'issuer' => 'PMI', 'date' => '2015-06'], ['id' => Str::uuid(), 'name' => 'OSHA 30-Hour', 'issuer' => 'OSHA', 'date' => '2023-01']],
            ],
            [
                'name' => 'Sales Executive',
                'template' => 'modern',
                'summary' => 'High-performing sales executive with 11 years closing enterprise software deals. Consistent top-10% performer with a track record of exceeding quota by 125%+.',
                'contact' => ['email' => 'richard@example.com', 'phone' => '555-0113', 'location' => 'Atlanta, GA', 'linkedin' => 'linkedin.com/in/richardmethod'],
                'experience' => [
                    ['id' => Str::uuid(), 'company' => 'SoftwareSales Pro', 'title' => 'Enterprise Account Executive', 'start_date' => 'Jan 2019', 'end_date' => 'Present',  'current' => true,  'bullets' => "Closed \$4.2M in new ARR in FY2023, 138% of quota\nBuilt pipeline from \$0 to \$8M within 18 months of territory assignment\nWon 3 competitive deals against Salesforce and Microsoft"],
                    ['id' => Str::uuid(), 'company' => 'TechSell Inc',      'title' => 'Account Executive',           'start_date' => 'May 2013', 'end_date' => 'Dec 2018', 'current' => false, 'bullets' => "Managed 80-account book of business totaling \$6M ARR\nPromoted to Senior AE within 18 months\nAchieved President's Club 3 consecutive years"],
                ],
                'education' => [
                    ['id' => Str::uuid(), 'school' => 'University of Georgia', 'degree' => 'B.B.A.', 'field' => 'Marketing', 'grad_year' => '2013'],
                ],
                'skills' => ['Salesforce CRM', 'MEDDIC', 'Challenger Sale', 'Pipeline Management', 'Contract Negotiation', 'Outreach.io', 'LinkedIn Sales Navigator'],
                'certifications' => [['id' => Str::uuid(), 'name' => 'Sandler Sales Certification', 'issuer' => 'Sandler Training', 'date' => '2020-11']],
            ],
            [
                'name' => 'Front-End Developer',
                'template' => 'minimal',
                'summary' => 'Front-end developer specializing in React and modern JavaScript. Obsessed with performance, accessibility, and pixel-perfect implementation of design systems.',
                'contact' => ['email' => 'richard@example.com', 'phone' => '555-0114', 'location' => 'Portland, OR', 'linkedin' => 'linkedin.com/in/richardmethod'],
                'experience' => [
                    ['id' => Str::uuid(), 'company' => 'WebCraft Studio',    'title' => 'Senior Front-End Developer', 'start_date' => 'Sep 2020', 'end_date' => 'Present',  'current' => true,  'bullets' => "Rebuilt client portal in React, improving Lighthouse score from 58 to 97\nMaintained shared component library used by 4 product teams\nReduced bundle size by 42% through code splitting and tree shaking"],
                    ['id' => Str::uuid(), 'company' => 'PixelPerfect Agency', 'title' => 'Front-End Developer',       'start_date' => 'Mar 2017', 'end_date' => 'Aug 2020', 'current' => false, 'bullets' => "Delivered 20+ client websites using React and Next.js\nImplemented WCAG 2.1 AA accessibility across all projects\nIntegrated headless CMS solutions for 8 enterprise clients"],
                ],
                'education' => [
                    ['id' => Str::uuid(), 'school' => 'Portland State University', 'degree' => 'B.S.', 'field' => 'Computer Science', 'grad_year' => '2017'],
                ],
                'skills' => ['React', 'TypeScript', 'Next.js', 'Tailwind CSS', 'GraphQL', 'Jest', 'Webpack'],
                'certifications' => [['id' => Str::uuid(), 'name' => 'Meta Front-End Developer Certificate', 'issuer' => 'Meta', 'date' => '2022-06']],
            ],
            [
                'name' => 'Human Resources Manager',
                'template' => 'classic',
                'summary' => 'Strategic HR manager with 10 years partnering with leadership to build high-performance cultures. Expertise in talent acquisition, employee relations, and total rewards.',
                'contact' => ['email' => 'richard@example.com', 'phone' => '555-0115', 'location' => 'Minneapolis, MN', 'linkedin' => 'linkedin.com/in/richardmethod'],
                'experience' => [
                    ['id' => Str::uuid(), 'company' => 'TalentFirst Corp', 'title' => 'HR Manager',            'start_date' => 'Jun 2018', 'end_date' => 'Present',  'current' => true,  'bullets' => "Reduced time-to-hire from 52 to 28 days by redesigning recruitment process\nLaunched DEI initiative increasing underrepresented hiring by 40%\nManaged benefits renewal for 500-employee workforce"],
                    ['id' => Str::uuid(), 'company' => 'PeopleOps Inc',    'title' => 'HR Business Partner',   'start_date' => 'Feb 2014', 'end_date' => 'May 2018', 'current' => false, 'bullets' => "Supported 3 business units with 300+ employees across 4 states\nResolved 50+ employee relations matters without litigation\nRolled out new HRIS, training 200+ managers on self-service tools"],
                ],
                'education' => [
                    ['id' => Str::uuid(), 'school' => 'University of Minnesota', 'degree' => 'B.A.', 'field' => 'Human Resources Management', 'grad_year' => '2014'],
                ],
                'skills' => ['Workday HRIS', 'Talent Acquisition', 'Employee Relations', 'Compensation Analysis', 'HRIS Implementation', 'Labor Law', 'Succession Planning'],
                'certifications' => [['id' => Str::uuid(), 'name' => 'SHRM-SCP', 'issuer' => 'SHRM', 'date' => '2019-08'], ['id' => Str::uuid(), 'name' => 'PHR', 'issuer' => 'HRCI', 'date' => '2017-05']],
            ],
            [
                'name' => 'Supply Chain Manager',
                'template' => 'modern',
                'summary' => 'Supply chain manager with 9 years optimizing global procurement and logistics operations. Proven ability to reduce costs, improve lead times, and manage supplier risk.',
                'contact' => ['email' => 'richard@example.com', 'phone' => '555-0116', 'location' => 'Memphis, TN', 'linkedin' => 'linkedin.com/in/richardmethod'],
                'experience' => [
                    ['id' => Str::uuid(), 'company' => 'GlobalLogix', 'title' => 'Supply Chain Manager', 'start_date' => 'Aug 2019', 'end_date' => 'Present',  'current' => true,  'bullets' => "Reduced COGS by \$2.3M annually through supplier renegotiations\nImplemented S&OP process improving forecast accuracy to 94%\nLed response to 3 supply disruptions with zero customer-facing impact"],
                    ['id' => Str::uuid(), 'company' => 'ShipFast Corp', 'title' => 'Supply Chain Analyst', 'start_date' => 'Apr 2015', 'end_date' => 'Jul 2019', 'current' => false, 'bullets' => "Managed \$40M supplier portfolio across 12 countries\nDeveloped inventory optimization model reducing holding costs by 18%\nIntroduced supplier scorecard program for 50+ vendors"],
                ],
                'education' => [
                    ['id' => Str::uuid(), 'school' => 'University of Tennessee', 'degree' => 'B.S.', 'field' => 'Supply Chain Management', 'grad_year' => '2015'],
                ],
                'skills' => ['SAP ERP', 'Demand Planning', 'Procurement', 'Logistics', 'S&OP', 'Lean/Six Sigma', 'Supplier Management'],
                'certifications' => [['id' => Str::uuid(), 'name' => 'CSCP', 'issuer' => 'APICS', 'date' => '2020-06'], ['id' => Str::uuid(), 'name' => 'Six Sigma Black Belt', 'issuer' => 'ASQ', 'date' => '2022-09']],
            ],
            [
                'name' => 'Accountant — Public',
                'template' => 'classic',
                'summary' => 'CPA with 8 years in public accounting and corporate tax. Experienced in federal and state tax compliance, planning, and representing clients before the IRS.',
                'contact' => ['email' => 'richard@example.com', 'phone' => '555-0117', 'location' => 'Dallas, TX', 'linkedin' => 'linkedin.com/in/richardmethod'],
                'experience' => [
                    ['id' => Str::uuid(), 'company' => 'Grant & Associates CPA', 'title' => 'Tax Manager',          'start_date' => 'Jan 2020', 'end_date' => 'Present',  'current' => true,  'bullets' => "Managed \$3.5M client portfolio of corporate and individual tax engagements\nIdentified \$1.2M in tax savings through R&D credit studies\nSupervised team of 4 seniors and 6 staff accountants"],
                    ['id' => Str::uuid(), 'company' => 'Regional CPA Firm',      'title' => 'Senior Tax Associate', 'start_date' => 'Jul 2016', 'end_date' => 'Dec 2019', 'current' => false, 'bullets' => "Prepared 200+ federal and state returns annually\nHandled IRS correspondence and represented 15 clients in audits\nImplemented CCH Axcess, reducing review time by 30%"],
                ],
                'education' => [
                    ['id' => Str::uuid(), 'school' => 'Southern Methodist University', 'degree' => 'M.S.',   'field' => 'Accounting', 'grad_year' => '2016'],
                    ['id' => Str::uuid(), 'school' => 'Texas Christian University',    'degree' => 'B.B.A.', 'field' => 'Accounting', 'grad_year' => '2014'],
                ],
                'skills' => ['Tax Compliance', 'CCH Axcess', 'QuickBooks', 'Financial Reporting', 'Excel/VBA', 'Partnership Taxation', 'IRS Representation'],
                'certifications' => [['id' => Str::uuid(), 'name' => 'CPA', 'issuer' => 'AICPA', 'date' => '2018-03']],
            ],
            [
                'name' => 'Electrical Engineer',
                'template' => 'minimal',
                'summary' => 'Electrical engineer with 8 years in power systems and embedded electronics. Strong background in PCB design, firmware development, and power electronics.',
                'contact' => ['email' => 'richard@example.com', 'phone' => '555-0118', 'location' => 'Raleigh, NC', 'linkedin' => 'linkedin.com/in/richardmethod'],
                'experience' => [
                    ['id' => Str::uuid(), 'company' => 'PowerTech Systems',   'title' => 'Senior Electrical Engineer', 'start_date' => 'Sep 2019', 'end_date' => 'Present',  'current' => true,  'bullets' => "Designed 48V battery management system for EV charging station\nReduced PCB assembly cost by 22% through component consolidation\nLed EMC testing and certification for 3 product lines"],
                    ['id' => Str::uuid(), 'company' => 'Embedded Innovations', 'title' => 'Electrical Engineer',        'start_date' => 'Jan 2016', 'end_date' => 'Aug 2019', 'current' => false, 'bullets' => "Developed firmware for ARM Cortex-M4 microcontrollers\nDesigned analog signal conditioning circuits for IoT sensors\nCollaborated with mechanical team on DFM for 4 hardware products"],
                ],
                'education' => [
                    ['id' => Str::uuid(), 'school' => 'NC State University', 'degree' => 'B.S.', 'field' => 'Electrical Engineering', 'grad_year' => '2016'],
                ],
                'skills' => ['PCB Design (Altium)', 'Embedded C/C++', 'Power Electronics', 'SPICE Simulation', 'FPGA', 'EMC/EMI Testing', 'Signal Processing'],
                'certifications' => [['id' => Str::uuid(), 'name' => 'Professional Engineer (PE) — EE', 'issuer' => 'NCEES', 'date' => '2020-07']],
            ],
            [
                'name' => 'Content Strategist',
                'template' => 'modern',
                'summary' => 'Content strategist with 7 years building editorial programs that drive organic growth and audience engagement. Expert in SEO, content operations, and brand voice development.',
                'contact' => ['email' => 'richard@example.com', 'phone' => '555-0119', 'location' => 'Boston, MA', 'linkedin' => 'linkedin.com/in/richardmethod'],
                'experience' => [
                    ['id' => Str::uuid(), 'company' => 'ContentLab',     'title' => 'Content Strategy Lead', 'start_date' => 'Mar 2020', 'end_date' => 'Present',  'current' => true,  'bullets' => "Grew blog traffic from 80K to 600K monthly sessions in 2 years\nBuilt and managed team of 6 writers and 2 SEO specialists\nDeveloped content pillar strategy generating 45% of inbound leads"],
                    ['id' => Str::uuid(), 'company' => 'DigitalWords Inc', 'title' => 'Content Strategist',  'start_date' => 'Oct 2016', 'end_date' => 'Feb 2020', 'current' => false, 'bullets' => "Produced 4 long-form guides ranking on page 1 for high-volume keywords\nEstablished editorial calendar and style guide adopted company-wide\nManaged relationships with 20+ freelance contributors"],
                ],
                'education' => [
                    ['id' => Str::uuid(), 'school' => 'Boston University', 'degree' => 'B.A.', 'field' => 'Journalism', 'grad_year' => '2016'],
                ],
                'skills' => ['SEO', 'WordPress', 'Ahrefs/SEMrush', 'Content Operations', 'Editorial Planning', 'Copywriting', 'Google Analytics'],
                'certifications' => [['id' => Str::uuid(), 'name' => 'Content Marketing Certified', 'issuer' => 'HubSpot', 'date' => '2021-04'], ['id' => Str::uuid(), 'name' => 'Google Analytics Certified', 'issuer' => 'Google', 'date' => '2022-10']],
            ],
            [
                'name' => 'Operations Manager',
                'template' => 'classic',
                'summary' => 'Operations manager with 10 years streamlining business processes in retail and logistics. Skilled in cross-functional leadership, process improvement, and P&L management.',
                'contact' => ['email' => 'richard@example.com', 'phone' => '555-0120', 'location' => 'Columbus, OH', 'linkedin' => 'linkedin.com/in/richardmethod'],
                'experience' => [
                    ['id' => Str::uuid(), 'company' => 'RetailOps Group', 'title' => 'Operations Manager',    'start_date' => 'Nov 2018', 'end_date' => 'Present',  'current' => true,  'bullets' => "Managed \$8M P&L for 120-employee distribution center\nReduced operational costs by \$1.1M through process reengineering\nImproved on-time shipment rate from 87% to 98.5%"],
                    ['id' => Str::uuid(), 'company' => 'FastLogistics',   'title' => 'Operations Supervisor', 'start_date' => 'Jun 2014', 'end_date' => 'Oct 2018', 'current' => false, 'bullets' => "Supervised 45 warehouse associates across 3 shifts\nImplemented WMS reducing order error rate by 65%\nLed cross-training initiative improving staffing flexibility by 30%"],
                ],
                'education' => [
                    ['id' => Str::uuid(), 'school' => 'Ohio State University', 'degree' => 'B.S.', 'field' => 'Operations Management', 'grad_year' => '2014'],
                ],
                'skills' => ['P&L Management', 'WMS/ERP Systems', 'Lean Manufacturing', 'KPI Reporting', 'Team Leadership', 'Process Improvement', 'Microsoft Office'],
                'certifications' => [['id' => Str::uuid(), 'name' => 'PMP', 'issuer' => 'PMI', 'date' => '2017-09'], ['id' => Str::uuid(), 'name' => 'Six Sigma Green Belt', 'issuer' => 'ASQ', 'date' => '2020-05']],
            ],
            [
                'name' => 'Software Architect',
                'template' => 'minimal',
                'summary' => 'Software architect with 15 years designing enterprise systems. Deep expertise in distributed systems, event-driven architecture, and technical leadership across global teams.',
                'contact' => ['email' => 'richard@example.com', 'phone' => '555-0121', 'location' => 'San Jose, CA', 'linkedin' => 'linkedin.com/in/richardmethod'],
                'experience' => [
                    ['id' => Str::uuid(), 'company' => 'Enterprise Systems Co',              'title' => 'Principal Software Architect',          'start_date' => 'Jan 2017', 'end_date' => 'Present',  'current' => true,  'bullets' => "Architected event-driven platform processing 1B+ events/day\nReduced system latency by 70% through architectural redesign\nLed architecture review board with 12 senior engineers"],
                    ['id' => Str::uuid(), 'company' => 'TechGiant Inc',                      'title' => 'Senior Software Engineer / Architect',  'start_date' => 'Mar 2012', 'end_date' => 'Dec 2016', 'current' => false, 'bullets' => "Designed multi-tenant SaaS platform serving 10K+ enterprise customers\nEstablished engineering standards adopted by 200-engineer org\nMigrated data pipeline to Apache Kafka, improving throughput 5x"],
                    ['id' => Str::uuid(), 'company' => 'StartupRocket',                      'title' => 'Software Engineer',                     'start_date' => 'Jun 2008', 'end_date' => 'Feb 2012', 'current' => false, 'bullets' => "Built core product from scratch, grew to 500K users\nImplemented horizontal scaling strategy for Black Friday 10x traffic spikes"],
                ],
                'education' => [
                    ['id' => Str::uuid(), 'school' => 'Stanford University', 'degree' => 'M.S.', 'field' => 'Computer Science', 'grad_year' => '2008'],
                    ['id' => Str::uuid(), 'school' => 'UC San Diego',        'degree' => 'B.S.', 'field' => 'Computer Science', 'grad_year' => '2006'],
                ],
                'skills' => ['Distributed Systems', 'Apache Kafka', 'Microservices', 'Java/Go', 'Cloud Architecture', 'DDD', 'System Design'],
                'certifications' => [['id' => Str::uuid(), 'name' => 'AWS Solutions Architect Professional', 'issuer' => 'Amazon', 'date' => '2020-02'], ['id' => Str::uuid(), 'name' => 'Google Cloud Architect', 'issuer' => 'Google', 'date' => '2021-07']],
            ],
            [
                'name' => 'Pharmacist',
                'template' => 'classic',
                'summary' => 'Clinical pharmacist with 9 years in hospital and retail settings. Expertise in medication therapy management, patient counseling, and pharmacy operations.',
                'contact' => ['email' => 'richard@example.com', 'phone' => '555-0122', 'location' => 'Nashville, TN', 'linkedin' => 'linkedin.com/in/richardmethod'],
                'experience' => [
                    ['id' => Str::uuid(), 'company' => 'Vanderbilt Medical Center',  'title' => 'Clinical Pharmacist', 'start_date' => 'Jul 2019', 'end_date' => 'Present',  'current' => true,  'bullets' => "Managed medication therapy for 40-bed oncology unit\nPrevented 85 adverse drug events annually through medication reconciliation\nPrecepted 6 pharmacy residents and 12 pharmacy students"],
                    ['id' => Str::uuid(), 'company' => 'Community Pharmacy Chain',   'title' => 'Staff Pharmacist',    'start_date' => 'Jun 2015', 'end_date' => 'Jun 2019', 'current' => false, 'bullets' => "Dispensed 350+ prescriptions daily with 99.9% accuracy\nProvided MTM consultations to 200+ patients monthly\nTrained and supervised 4 pharmacy technicians"],
                ],
                'education' => [
                    ['id' => Str::uuid(), 'school' => 'University of Tennessee',  'degree' => 'Pharm.D.',              'field' => 'Pharmacy',            'grad_year' => '2015'],
                    ['id' => Str::uuid(), 'school' => 'Vanderbilt Medical Center', 'degree' => 'PGY-1 Residency',      'field' => 'Pharmacy Practice',   'grad_year' => '2016'],
                ],
                'skills' => ['Medication Therapy Management', 'Epic', 'Clinical Decision Support', 'Patient Counseling', 'Anticoagulation Management', 'IV Admixture', 'Pharmacy Operations'],
                'certifications' => [['id' => Str::uuid(), 'name' => 'Board Certified Pharmacotherapy Specialist (BCPS)', 'issuer' => 'BPS', 'date' => '2017-05'], ['id' => Str::uuid(), 'name' => 'Immunization Certified', 'issuer' => 'APhA', 'date' => '2016-01']],
            ],
            [
                'name' => 'Business Intelligence Developer',
                'template' => 'modern',
                'summary' => 'BI developer with 6 years transforming raw data into actionable executive dashboards. Expert in Power BI, Tableau, and building scalable data warehouse solutions.',
                'contact' => ['email' => 'richard@example.com', 'phone' => '555-0123', 'location' => 'Charlotte, NC', 'linkedin' => 'linkedin.com/in/richardmethod'],
                'experience' => [
                    ['id' => Str::uuid(), 'company' => 'DataDriven Corp',  'title' => 'Senior BI Developer', 'start_date' => 'Mar 2021', 'end_date' => 'Present',  'current' => true,  'bullets' => "Built executive KPI dashboard suite used by C-suite in 12 countries\nDesigned star-schema data warehouse consolidating 8 source systems\nReduced monthly reporting cycle from 5 days to 4 hours"],
                    ['id' => Str::uuid(), 'company' => 'Insights Analytics', 'title' => 'BI Developer',       'start_date' => 'Jan 2018', 'end_date' => 'Feb 2021', 'current' => false, 'bullets' => "Developed 40+ Power BI reports serving 500+ business users\nCreated ETL pipelines processing 10M+ rows daily using SSIS\nTrained 30 analysts on self-service BI best practices"],
                ],
                'education' => [
                    ['id' => Str::uuid(), 'school' => 'University of North Carolina', 'degree' => 'B.S.', 'field' => 'Information Systems', 'grad_year' => '2018'],
                ],
                'skills' => ['Power BI', 'Tableau', 'SQL Server', 'DAX/MDX', 'SSIS/SSRS', 'Azure Synapse', 'Python'],
                'certifications' => [['id' => Str::uuid(), 'name' => 'Microsoft PL-300 (Power BI)', 'issuer' => 'Microsoft', 'date' => '2022-04'], ['id' => Str::uuid(), 'name' => 'Tableau Desktop Specialist', 'issuer' => 'Tableau', 'date' => '2022-11']],
            ],
            [
                'name' => 'Attorney — Corporate',
                'template' => 'classic',
                'summary' => 'Corporate attorney with 10 years advising clients on M&A, venture financing, and commercial contracts. Trusted counsel to startups, PE-backed companies, and public issuers.',
                'contact' => ['email' => 'richard@example.com', 'phone' => '555-0124', 'location' => 'San Francisco, CA', 'linkedin' => 'linkedin.com/in/richardmethod'],
                'experience' => [
                    ['id' => Str::uuid(), 'company' => 'Venture Law Group LLP', 'title' => 'Corporate Associate', 'start_date' => 'Sep 2018', 'end_date' => 'Present',  'current' => true,  'bullets' => "Closed \$600M+ in M&A transactions as lead deal attorney\nAdvised 25+ startups on Series A–D financings totaling \$350M\nDrafted and negotiated 200+ commercial contracts annually"],
                    ['id' => Str::uuid(), 'company' => 'BigLaw Firm LLP',        'title' => 'Corporate Associate', 'start_date' => 'Sep 2013', 'end_date' => 'Aug 2018', 'current' => false, 'bullets' => "Supported \$2B public offering for NYSE-listed technology company\nManaged due diligence workstreams for 10 M&A transactions\nDrafted proxy statements and SEC periodic reports"],
                ],
                'education' => [
                    ['id' => Str::uuid(), 'school' => 'UC Berkeley School of Law', 'degree' => 'J.D.',   'field' => 'Law',              'grad_year' => '2013'],
                    ['id' => Str::uuid(), 'school' => 'UCLA',                      'degree' => 'B.A.',   'field' => 'Political Science', 'grad_year' => '2010'],
                ],
                'skills' => ['M&A Transactions', 'Venture Financing', 'Contract Drafting', 'Securities Law', 'Due Diligence', 'Corporate Governance', 'Cap Table Management'],
                'certifications' => [['id' => Str::uuid(), 'name' => 'California State Bar', 'issuer' => 'State Bar of California', 'date' => '2013-11']],
            ],
            [
                'name' => 'Physical Therapist',
                'template' => 'minimal',
                'summary' => 'Licensed physical therapist with 7 years in orthopedic and sports rehabilitation. Committed to evidence-based practice and helping athletes return to peak performance.',
                'contact' => ['email' => 'richard@example.com', 'phone' => '555-0125', 'location' => 'Denver, CO', 'linkedin' => 'linkedin.com/in/richardmethod'],
                'experience' => [
                    ['id' => Str::uuid(), 'company' => 'ProSports Physical Therapy', 'title' => 'Senior Physical Therapist', 'start_date' => 'Jan 2020', 'end_date' => 'Present',  'current' => true,  'bullets' => "Treated 25+ patients daily specializing in ACL and rotator cuff rehab\nAchieved 96% patient satisfaction rating across 3 years\nDeveloped post-op protocol adopted clinic-wide, reducing recovery time by 2 weeks"],
                    ['id' => Str::uuid(), 'company' => 'Ortho Rehab Center',          'title' => 'Staff Physical Therapist', 'start_date' => 'Aug 2016', 'end_date' => 'Dec 2019', 'current' => false, 'bullets' => "Managed caseload of 20+ patients across orthopedic and neurological conditions\nSupervised 3 PT assistants and 2 students per semester\nIntroduced dry needling program serving 50+ patients monthly"],
                ],
                'education' => [
                    ['id' => Str::uuid(), 'school' => 'University of Colorado', 'degree' => 'DPT',  'field' => 'Physical Therapy', 'grad_year' => '2016'],
                    ['id' => Str::uuid(), 'school' => 'Colorado College',        'degree' => 'B.S.', 'field' => 'Kinesiology',      'grad_year' => '2013'],
                ],
                'skills' => ['Orthopedic Rehabilitation', 'Manual Therapy', 'Dry Needling', 'Sports Performance', 'Functional Movement Screen', 'WebPT EMR', 'Patient Education'],
                'certifications' => [['id' => Str::uuid(), 'name' => 'Orthopedic Clinical Specialist (OCS)', 'issuer' => 'ABPTS', 'date' => '2019-06'], ['id' => Str::uuid(), 'name' => 'Certified Strength & Conditioning Specialist', 'issuer' => 'NSCA', 'date' => '2021-03']],
            ],
        ];

        foreach ($resumes as $data) {
            $existing = Resume::where('user_id', $user->id)
                ->where('name', $data['name'])
                ->first();

            $payload = [
                'user_id' => $user->id,
                'name' => $data['name'],
                'template' => $data['template'],
                'summary' => $data['summary'],
                'contact' => json_encode($data['contact']),
                'experience' => json_encode($data['experience']),
                'education' => json_encode($data['education']),
                'skills' => json_encode($data['skills']),
                'certifications' => json_encode($data['certifications']),
                'updated_at' => now(),
            ];

            if ($existing) {
                DB::table('resumes')->where('id', $existing->id)->update($payload);
            } else {
                DB::table('resumes')->insert(array_merge($payload, ['created_at' => now()]));
            }
        }
    }
}
