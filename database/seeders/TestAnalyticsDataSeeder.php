<?php

namespace Database\Seeders;

use App\Models\ResumeShareLink;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class TestAnalyticsDataSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::firstOrCreate(
            ['email' => 'rmethodm@outlook.com'],
            [
                'name' => 'Richard Method',
                'password' => Hash::make('password'),
            ]
        );

        $resumes = [
            [
                'name' => 'Backend Engineer — Go',
                'template' => 'modern',
                'summary' => 'Go developer specializing in high-throughput microservices and gRPC APIs. Built systems processing 50M+ events per day.',
                'contact' => ['full_name' => 'Richard Method', 'email' => 'richard@example.com', 'phone' => '555-0201', 'location' => 'Austin, TX', 'linkedin' => 'linkedin.com/in/richardmethod', 'website' => ''],
                'experience' => [
                    ['id' => Str::uuid(), 'company' => 'StreamScale', 'title' => 'Staff Engineer', 'start_date' => 'Jan 2021', 'end_date' => '', 'current' => true, 'bullets' => "Designed event-streaming platform handling 50M events/day\nReduced P99 latency from 400ms to 18ms via protocol optimization\nLed team of 8 engineers across 3 time zones"],
                    ['id' => Str::uuid(), 'company' => 'CloudBase Inc', 'title' => 'Senior Go Engineer', 'start_date' => 'Mar 2017', 'end_date' => 'Dec 2020', 'current' => false, 'bullets' => "Built internal service mesh replacing third-party vendor, saving $2M/yr\nContributed 12 merged PRs to open-source gRPC gateway project\nAuthored internal Go style guide adopted across 4 teams"],
                ],
                'education' => [
                    ['id' => Str::uuid(), 'school' => 'University of Texas at Austin', 'degree' => 'B.S.', 'field' => 'Computer Science', 'grad_year' => '2017'],
                ],
                'skills' => ['Go', 'gRPC', 'Kafka', 'Kubernetes', 'PostgreSQL', 'Redis', 'Terraform'],
                'certifications' => [],
            ],
            [
                'name' => 'Clinical Psychologist',
                'template' => 'minimal',
                'summary' => 'Licensed clinical psychologist with 12 years of experience in cognitive-behavioral therapy and trauma-informed care.',
                'contact' => ['full_name' => 'Richard Method', 'email' => 'richard@example.com', 'phone' => '555-0202', 'location' => 'Chicago, IL', 'linkedin' => '', 'website' => ''],
                'experience' => [
                    ['id' => Str::uuid(), 'company' => 'Midwest Behavioral Health', 'title' => 'Senior Clinical Psychologist', 'start_date' => 'Sep 2016', 'end_date' => '', 'current' => true, 'bullets' => "Provide individual and group CBT to 30+ clients per week\nDeveloped evidence-based PTSD treatment protocol adopted clinic-wide\nSupervise 4 doctoral interns annually"],
                    ['id' => Str::uuid(), 'company' => 'Chicago VA Medical Center', 'title' => 'Staff Psychologist', 'start_date' => 'Jul 2012', 'end_date' => 'Aug 2016', 'current' => false, 'bullets' => "Assessed and treated veterans with complex trauma and co-occurring disorders\nPublished 3 peer-reviewed articles on EMDR efficacy\nFacilitated weekly DBT skills group for 12 veterans"],
                ],
                'education' => [
                    ['id' => Str::uuid(), 'school' => 'Northwestern University', 'degree' => 'Ph.D.', 'field' => 'Clinical Psychology', 'grad_year' => '2012'],
                    ['id' => Str::uuid(), 'school' => 'University of Michigan', 'degree' => 'B.A.', 'field' => 'Psychology', 'grad_year' => '2007'],
                ],
                'skills' => ['CBT', 'DBT', 'EMDR', 'Psychological Assessment', 'Group Therapy', 'Trauma-Informed Care'],
                'certifications' => [
                    ['id' => Str::uuid(), 'name' => 'Licensed Clinical Psychologist (IL)', 'issuer' => 'Illinois IDFPR', 'date' => '2013-06'],
                ],
            ],
            [
                'name' => 'Electrical Engineer — Power Systems',
                'template' => 'classic',
                'summary' => 'PE-licensed electrical engineer with 15 years in utility-scale power systems, substation design, and grid modernization projects.',
                'contact' => ['full_name' => 'Richard Method', 'email' => 'richard@example.com', 'phone' => '555-0203', 'location' => 'Denver, CO', 'linkedin' => 'linkedin.com/in/richardmethod', 'website' => ''],
                'experience' => [
                    ['id' => Str::uuid(), 'company' => 'Xcel Energy', 'title' => 'Principal Power Systems Engineer', 'start_date' => 'May 2015', 'end_date' => '', 'current' => true, 'bullets' => "Led design of 230kV transmission substation serving 180,000 customers\nManaged $45M capital project portfolio on time and under budget\nChampioned AMI deployment reducing outage response time by 35%"],
                    ['id' => Str::uuid(), 'company' => 'Burns & McDonnell', 'title' => 'Electrical Engineer II', 'start_date' => 'Jun 2009', 'end_date' => 'Apr 2015', 'current' => false, 'bullets' => "Designed protection and control systems for 15 substations\nPerformed load flow and short-circuit studies using PSCAD\nMentored 3 junior engineers through PE exam preparation"],
                ],
                'education' => [
                    ['id' => Str::uuid(), 'school' => 'Colorado State University', 'degree' => 'B.S.', 'field' => 'Electrical Engineering', 'grad_year' => '2009'],
                ],
                'skills' => ['Power Systems Design', 'AutoCAD', 'PSCAD', 'ETAP', 'NEC', 'NERC Standards', 'Project Management'],
                'certifications' => [
                    ['id' => Str::uuid(), 'name' => 'Professional Engineer (PE) — Electrical', 'issuer' => 'NCEES', 'date' => '2014-10'],
                ],
            ],
            [
                'name' => 'Elementary School Teacher',
                'template' => 'minimal',
                'summary' => 'Dedicated 2nd-grade teacher with 9 years of experience in differentiated instruction and project-based learning in Title I schools.',
                'contact' => ['full_name' => 'Richard Method', 'email' => 'richard@example.com', 'phone' => '555-0204', 'location' => 'Atlanta, GA', 'linkedin' => '', 'website' => ''],
                'experience' => [
                    ['id' => Str::uuid(), 'company' => 'Atlanta Public Schools', 'title' => '2nd Grade Teacher', 'start_date' => 'Aug 2018', 'end_date' => '', 'current' => true, 'bullets' => "Raised class reading proficiency from 54% to 87% over two years\nDesigned and led school-wide STEM fair attended by 400+ families\nMentored 6 student teachers from Georgia State University"],
                    ['id' => Str::uuid(), 'company' => 'Fulton County Schools', 'title' => '1st Grade Teacher', 'start_date' => 'Aug 2015', 'end_date' => 'Jun 2018', 'current' => false, 'bullets' => "Implemented readers workshop model improving DRA scores by 1.5 grade levels\nCollaborated on grade-level PLCs to align curriculum with Common Core\nRecipient of Rookie Teacher of the Year award 2016"],
                ],
                'education' => [
                    ['id' => Str::uuid(), 'school' => 'Kennesaw State University', 'degree' => 'M.Ed.', 'field' => 'Elementary Education', 'grad_year' => '2015'],
                    ['id' => Str::uuid(), 'school' => 'University of Georgia', 'degree' => 'B.S.', 'field' => 'Education', 'grad_year' => '2013'],
                ],
                'skills' => ['Differentiated Instruction', 'Google Classroom', 'Project-Based Learning', 'Positive Behavior Support', 'ESOL'],
                'certifications' => [
                    ['id' => Str::uuid(), 'name' => 'GA Professional Teaching License', 'issuer' => 'Georgia PSC', 'date' => '2015-08'],
                ],
            ],
            [
                'name' => 'Blockchain Developer',
                'template' => 'modern',
                'summary' => 'Solidity and Rust developer with 6 years building DeFi protocols, NFT platforms, and cross-chain bridges on EVM-compatible networks.',
                'contact' => ['full_name' => 'Richard Method', 'email' => 'richard@example.com', 'phone' => '555-0205', 'location' => 'Miami, FL', 'linkedin' => 'linkedin.com/in/richardmethod', 'website' => 'github.com/rmethod'],
                'experience' => [
                    ['id' => Str::uuid(), 'company' => 'DeFi Labs', 'title' => 'Lead Smart Contract Engineer', 'start_date' => 'Feb 2022', 'end_date' => '', 'current' => true, 'bullets' => "Architected AMM protocol with $200M TVL at peak\nConducted and remediated findings from 4 third-party security audits\nReduced gas costs by 30% via assembly-level optimization"],
                    ['id' => Str::uuid(), 'company' => 'NFT Studio', 'title' => 'Smart Contract Developer', 'start_date' => 'Jan 2019', 'end_date' => 'Jan 2022', 'current' => false, 'bullets' => "Deployed 8 NFT collections minting 500K+ tokens\nBuilt royalty-splitting contract handling $12M in secondary sales\nIntegrated Chainlink VRF for provably fair trait generation"],
                ],
                'education' => [
                    ['id' => Str::uuid(), 'school' => 'MIT', 'degree' => 'B.S.', 'field' => 'Computer Science', 'grad_year' => '2018'],
                ],
                'skills' => ['Solidity', 'Rust', 'Hardhat', 'Foundry', 'Ethers.js', 'The Graph', 'Chainlink'],
                'certifications' => [
                    ['id' => Str::uuid(), 'name' => 'Certified Ethereum Developer', 'issuer' => 'Blockchain Council', 'date' => '2020-05'],
                ],
            ],
            [
                'name' => 'Radiologic Technologist',
                'template' => 'classic',
                'summary' => 'ARRT-registered radiologic technologist with 11 years in high-volume trauma centers. Proficient in CT, MRI, and fluoroscopy.',
                'contact' => ['full_name' => 'Richard Method', 'email' => 'richard@example.com', 'phone' => '555-0206', 'location' => 'Phoenix, AZ', 'linkedin' => '', 'website' => ''],
                'experience' => [
                    ['id' => Str::uuid(), 'company' => 'Banner University Medical Center', 'title' => 'Lead Radiologic Technologist', 'start_date' => 'Mar 2017', 'end_date' => '', 'current' => true, 'bullets' => "Perform 40+ imaging exams daily across CT, X-ray, and fluoroscopy\nTrain and orient 6 new RT staff per year\nReduced average CT scan time by 18% through workflow redesign"],
                    ['id' => Str::uuid(), 'company' => 'Dignity Health Arizona', 'title' => 'Radiologic Technologist', 'start_date' => 'Jun 2013', 'end_date' => 'Feb 2017', 'current' => false, 'bullets' => "Operated Siemens SOMATOM CT scanner in 24/7 trauma environment\nMaintained 99.2% image quality acceptance rate per QA audit\nCross-trained in MRI operations for emergency coverage"],
                ],
                'education' => [
                    ['id' => Str::uuid(), 'school' => 'GateWay Community College', 'degree' => 'A.A.S.', 'field' => 'Radiologic Technology', 'grad_year' => '2013'],
                ],
                'skills' => ['CT', 'MRI', 'Fluoroscopy', 'PACS', 'Epic', 'Radiation Safety', 'Patient Care'],
                'certifications' => [
                    ['id' => Str::uuid(), 'name' => 'ARRT (R)(CT)', 'issuer' => 'ARRT', 'date' => '2013-09'],
                    ['id' => Str::uuid(), 'name' => 'AZ State RT License', 'issuer' => 'Arizona Medical Board', 'date' => '2013-10'],
                ],
            ],
            [
                'name' => 'Real Estate Agent',
                'template' => 'classic',
                'summary' => 'Top-producing buyer\'s and seller\'s agent with $42M in closed transactions over the past 3 years in the greater Seattle market.',
                'contact' => ['full_name' => 'Richard Method', 'email' => 'richard@example.com', 'phone' => '555-0207', 'location' => 'Seattle, WA', 'linkedin' => 'linkedin.com/in/richardmethod', 'website' => ''],
                'experience' => [
                    ['id' => Str::uuid(), 'company' => 'Windermere Real Estate', 'title' => 'Realtor / Buyer & Seller Agent', 'start_date' => 'Jan 2019', 'end_date' => '', 'current' => true, 'bullets' => "Closed $42M in residential sales 2021–2023, ranking in top 5% company-wide\nMaintained 98% client satisfaction score across 120+ transactions\nSpecialized in first-time buyers and investment property analysis"],
                    ['id' => Str::uuid(), 'company' => 'Coldwell Banker', 'title' => 'Real Estate Agent', 'start_date' => 'Apr 2015', 'end_date' => 'Dec 2018', 'current' => false, 'bullets' => "Sold 25+ homes per year averaging 104% of list price\nBuilt referral network generating 60% of new business\nWon Rookie of the Year award in first full year"],
                ],
                'education' => [
                    ['id' => Str::uuid(), 'school' => 'University of Washington', 'degree' => 'B.A.', 'field' => 'Business Administration', 'grad_year' => '2014'],
                ],
                'skills' => ['CMA', 'Negotiation', 'MLS', 'DocuSign', 'Listing Presentations', 'Investment Analysis'],
                'certifications' => [
                    ['id' => Str::uuid(), 'name' => 'WA Real Estate License', 'issuer' => 'WA DOL', 'date' => '2015-03'],
                    ['id' => Str::uuid(), 'name' => 'Certified Buyer\'s Representative (CBR)', 'issuer' => 'NAR', 'date' => '2017-06'],
                ],
            ],
            [
                'name' => 'Machine Learning Engineer',
                'template' => 'modern',
                'summary' => 'ML engineer with 8 years building production recommendation systems, NLP pipelines, and LLM-powered features at scale.',
                'contact' => ['full_name' => 'Richard Method', 'email' => 'richard@example.com', 'phone' => '555-0208', 'location' => 'San Jose, CA', 'linkedin' => 'linkedin.com/in/richardmethod', 'website' => ''],
                'experience' => [
                    ['id' => Str::uuid(), 'company' => 'PinPoint AI', 'title' => 'Staff ML Engineer', 'start_date' => 'Jul 2020', 'end_date' => '', 'current' => true, 'bullets' => "Built personalized ranking model increasing CTR by 22% across 50M users\nFine-tuned LLaMA 2 for domain-specific Q&A, reducing hallucination rate by 40%\nArchitected feature store serving 200K model inferences/second"],
                    ['id' => Str::uuid(), 'company' => 'Adobe', 'title' => 'Senior Machine Learning Engineer', 'start_date' => 'Sep 2016', 'end_date' => 'Jun 2020', 'current' => false, 'bullets' => "Developed content-based image recommendation system for Adobe Stock\nReduced model training time 3x via distributed training on 64 GPUs\nPublished 2 papers at NeurIPS on transfer learning for creative domains"],
                ],
                'education' => [
                    ['id' => Str::uuid(), 'school' => 'Stanford University', 'degree' => 'M.S.', 'field' => 'Computer Science (AI)', 'grad_year' => '2016'],
                    ['id' => Str::uuid(), 'school' => 'UC Berkeley', 'degree' => 'B.S.', 'field' => 'Electrical Engineering & CS', 'grad_year' => '2014'],
                ],
                'skills' => ['PyTorch', 'TensorFlow', 'LLMs', 'MLflow', 'Spark', 'Python', 'Kubernetes', 'Feature Stores'],
                'certifications' => [
                    ['id' => Str::uuid(), 'name' => 'AWS Certified ML Specialty', 'issuer' => 'Amazon', 'date' => '2021-11'],
                ],
            ],
            [
                'name' => 'Paralegal — Litigation',
                'template' => 'minimal',
                'summary' => 'Litigation paralegal with 10 years supporting complex commercial and IP disputes at AmLaw 100 firms.',
                'contact' => ['full_name' => 'Richard Method', 'email' => 'richard@example.com', 'phone' => '555-0209', 'location' => 'New York, NY', 'linkedin' => '', 'website' => ''],
                'experience' => [
                    ['id' => Str::uuid(), 'company' => 'Skadden, Arps, Slate, Meagher & Flom', 'title' => 'Senior Litigation Paralegal', 'start_date' => 'Jan 2019', 'end_date' => '', 'current' => true, 'bullets' => "Managed document review for matters exceeding 10M documents using Relativity\nDrafted and filed motions, pleadings, and discovery in federal and state courts\nCoordinated witness prep and trial logistics for 3 major commercial trials"],
                    ['id' => Str::uuid(), 'company' => 'Latham & Watkins', 'title' => 'Litigation Paralegal', 'start_date' => 'Mar 2014', 'end_date' => 'Dec 2018', 'current' => false, 'bullets' => "Supported IP team in 7 patent infringement cases through trial\nBuilt deposition exhibit databases for cases with 500+ witnesses\nTrained 4 junior paralegals on e-discovery workflows"],
                ],
                'education' => [
                    ['id' => Str::uuid(), 'school' => 'Fordham University', 'degree' => 'B.A.', 'field' => 'Political Science', 'grad_year' => '2014'],
                ],
                'skills' => ['Relativity', 'Westlaw', 'LexisNexis', 'Case Management', 'E-Discovery', 'PACER', 'Trial Prep'],
                'certifications' => [
                    ['id' => Str::uuid(), 'name' => 'Certified Paralegal (CP)', 'issuer' => 'NALA', 'date' => '2016-07'],
                ],
            ],
            [
                'name' => 'Civil Engineer — Structural',
                'template' => 'classic',
                'summary' => 'PE-licensed structural engineer with expertise in high-rise concrete and steel design, seismic retrofit, and bridge rehabilitation.',
                'contact' => ['full_name' => 'Richard Method', 'email' => 'richard@example.com', 'phone' => '555-0210', 'location' => 'Los Angeles, CA', 'linkedin' => 'linkedin.com/in/richardmethod', 'website' => ''],
                'experience' => [
                    ['id' => Str::uuid(), 'company' => 'AECOM', 'title' => 'Senior Structural Engineer', 'start_date' => 'Apr 2016', 'end_date' => '', 'current' => true, 'bullets' => "Led structural design of 42-story mixed-use tower in Downtown LA\nManaged seismic retrofit of 18 pre-Northridge concrete buildings\nCoordinated with geotechnical, MEP, and architectural teams on 12 projects"],
                    ['id' => Str::uuid(), 'company' => 'Thornton Tomasetti', 'title' => 'Structural Engineer', 'start_date' => 'Jul 2011', 'end_date' => 'Mar 2016', 'current' => false, 'bullets' => "Designed post-tensioned concrete slabs for 8 mid-rise residential projects\nPerformed ETABS and SAP2000 analysis for lateral system design\nSupported construction administration on $120M commercial project"],
                ],
                'education' => [
                    ['id' => Str::uuid(), 'school' => 'UCLA', 'degree' => 'M.S.', 'field' => 'Civil Engineering (Structural)', 'grad_year' => '2011'],
                    ['id' => Str::uuid(), 'school' => 'Cal Poly San Luis Obispo', 'degree' => 'B.S.', 'field' => 'Civil Engineering', 'grad_year' => '2009'],
                ],
                'skills' => ['ETABS', 'SAP2000', 'AutoCAD', 'Revit Structure', 'IBC', 'ASCE 7', 'Post-Tensioning'],
                'certifications' => [
                    ['id' => Str::uuid(), 'name' => 'Professional Engineer (PE) — Civil', 'issuer' => 'NCEES', 'date' => '2013-10'],
                    ['id' => Str::uuid(), 'name' => 'SE License (CA)', 'issuer' => 'CA BPELSG', 'date' => '2018-02'],
                ],
            ],
            [
                'name' => 'Pharmacist — Retail',
                'template' => 'minimal',
                'summary' => 'PharmD with 9 years in community pharmacy, specializing in medication therapy management and immunizations.',
                'contact' => ['full_name' => 'Richard Method', 'email' => 'richard@example.com', 'phone' => '555-0211', 'location' => 'Nashville, TN', 'linkedin' => '', 'website' => ''],
                'experience' => [
                    ['id' => Str::uuid(), 'company' => 'CVS Health', 'title' => 'Staff Pharmacist', 'start_date' => 'Oct 2018', 'end_date' => '', 'current' => true, 'bullets' => "Dispense 350+ prescriptions daily with 99.98% accuracy rate\nConduct MTM consultations reducing ER visits among diabetic patients by 14%\nAdministered 2,200+ immunizations annually including COVID-19 and influenza"],
                    ['id' => Str::uuid(), 'company' => 'Walgreens', 'title' => 'Staff Pharmacist', 'start_date' => 'Jun 2015', 'end_date' => 'Sep 2018', 'current' => false, 'bullets' => "Managed high-volume 24-hour pharmacy with 4-person tech team\nReduced fill errors by 28% through workflow standardization\nPreceptor for 6 PharmD interns from Belmont University"],
                ],
                'education' => [
                    ['id' => Str::uuid(), 'school' => 'Belmont University College of Pharmacy', 'degree' => 'Pharm.D.', 'field' => 'Pharmacy', 'grad_year' => '2015'],
                ],
                'skills' => ['Medication Therapy Management', 'Immunizations', 'Epic Willow', 'QS/1', 'Drug Utilization Review', 'Patient Counseling'],
                'certifications' => [
                    ['id' => Str::uuid(), 'name' => 'TN Pharmacist License', 'issuer' => 'TN Board of Pharmacy', 'date' => '2015-07'],
                    ['id' => Str::uuid(), 'name' => 'Immunization Certificate', 'issuer' => 'APhA', 'date' => '2015-09'],
                ],
            ],
            [
                'name' => 'Social Media Manager',
                'template' => 'modern',
                'summary' => 'Social media strategist with 7 years growing brand audiences and driving revenue through organic and paid campaigns across TikTok, Instagram, and LinkedIn.',
                'contact' => ['full_name' => 'Richard Method', 'email' => 'richard@example.com', 'phone' => '555-0212', 'location' => 'Los Angeles, CA', 'linkedin' => 'linkedin.com/in/richardmethod', 'website' => ''],
                'experience' => [
                    ['id' => Str::uuid(), 'company' => 'Pulse Digital Agency', 'title' => 'Director of Social Media', 'start_date' => 'Mar 2021', 'end_date' => '', 'current' => true, 'bullets' => "Grew client TikTok accounts from 0 to 2.4M followers in 18 months\nManaged $3.2M annual paid social budget with average 4.1x ROAS\nLed team of 6 content creators and 2 paid media specialists"],
                    ['id' => Str::uuid(), 'company' => 'Glossier', 'title' => 'Social Media Manager', 'start_date' => 'Jun 2017', 'end_date' => 'Feb 2021', 'current' => false, 'bullets' => "Grew Instagram from 800K to 2.9M followers organically\nLaunched influencer gifting program generating 14M+ impressions/month\nDrove 22% of e-commerce revenue through Instagram Shopping link clicks"],
                ],
                'education' => [
                    ['id' => Str::uuid(), 'school' => 'USC Annenberg School', 'degree' => 'B.A.', 'field' => 'Communication', 'grad_year' => '2017'],
                ],
                'skills' => ['TikTok', 'Instagram', 'LinkedIn', 'Meta Ads Manager', 'Sprout Social', 'Canva', 'Content Strategy'],
                'certifications' => [
                    ['id' => Str::uuid(), 'name' => 'Meta Certified Digital Marketing Associate', 'issuer' => 'Meta', 'date' => '2022-01'],
                ],
            ],
            [
                'name' => 'Orthodontist',
                'template' => 'classic',
                'summary' => 'Board-certified orthodontist with 14 years in private practice. Expert in clear aligner therapy, lingual braces, and early interceptive treatment.',
                'contact' => ['full_name' => 'Richard Method', 'email' => 'richard@example.com', 'phone' => '555-0213', 'location' => 'Charlotte, NC', 'linkedin' => '', 'website' => ''],
                'experience' => [
                    ['id' => Str::uuid(), 'company' => 'Smile Forward Orthodontics', 'title' => 'Owner & Orthodontist', 'start_date' => 'Jan 2015', 'end_date' => '', 'current' => true, 'bullets' => "Built solo practice to $2.8M annual revenue with 98% patient satisfaction\nExpanded to second location, growing patient base to 1,400 active cases\nDiamond+ Invisalign provider in top 1% nationally"],
                    ['id' => Str::uuid(), 'company' => 'Family Orthodontics of Charlotte', 'title' => 'Associate Orthodontist', 'start_date' => 'Jul 2010', 'end_date' => 'Dec 2014', 'current' => false, 'bullets' => "Treated 600+ active patients in a high-volume group practice\nIntroduced digital scanning, eliminating traditional impressions clinic-wide\nPrecepted orthodontic residents from UNC School of Dentistry"],
                ],
                'education' => [
                    ['id' => Str::uuid(), 'school' => 'University of North Carolina', 'degree' => 'M.S.D.', 'field' => 'Orthodontics', 'grad_year' => '2010'],
                    ['id' => Str::uuid(), 'school' => 'UNC Adams School of Dentistry', 'degree' => 'D.D.S.', 'field' => 'Dentistry', 'grad_year' => '2007'],
                ],
                'skills' => ['Invisalign', 'Lingual Braces', 'CBCT', 'Digital Scanning', 'Early Interceptive Treatment', 'Practice Management'],
                'certifications' => [
                    ['id' => Str::uuid(), 'name' => 'American Board of Orthodontics Diplomat', 'issuer' => 'ABO', 'date' => '2012-05'],
                ],
            ],
            [
                'name' => 'Supply Chain Director',
                'template' => 'modern',
                'summary' => 'Supply chain executive with 18 years leading global procurement, logistics, and inventory strategy for Fortune 500 manufacturers.',
                'contact' => ['full_name' => 'Richard Method', 'email' => 'richard@example.com', 'phone' => '555-0214', 'location' => 'Detroit, MI', 'linkedin' => 'linkedin.com/in/richardmethod', 'website' => ''],
                'experience' => [
                    ['id' => Str::uuid(), 'company' => 'Ford Motor Company', 'title' => 'Director of Global Supply Chain', 'start_date' => 'Feb 2018', 'end_date' => '', 'current' => true, 'bullets' => "Oversaw $4.2B annual procurement portfolio across 32 countries\nReduced supply chain disruption costs by $180M during COVID-19 crisis\nLed nearshoring initiative moving 40% of critical parts to North American suppliers"],
                    ['id' => Str::uuid(), 'company' => 'Lear Corporation', 'title' => 'Senior Manager, Procurement', 'start_date' => 'Mar 2011', 'end_date' => 'Jan 2018', 'current' => false, 'bullets' => "Managed 120-supplier seating systems portfolio worth $800M annually\nNegotiated 7-year LTAs saving $45M vs. prior agreements\nImplemented supplier risk dashboard tracking 200+ Tier 2 suppliers"],
                ],
                'education' => [
                    ['id' => Str::uuid(), 'school' => 'University of Michigan — Ross', 'degree' => 'M.B.A.', 'field' => 'Operations & Strategy', 'grad_year' => '2010'],
                    ['id' => Str::uuid(), 'school' => 'Michigan State University', 'degree' => 'B.S.', 'field' => 'Supply Chain Management', 'grad_year' => '2006'],
                ],
                'skills' => ['SAP Ariba', 'S&OP', 'Lean Manufacturing', 'Supplier Negotiation', 'Risk Management', 'APICS CPIM'],
                'certifications' => [
                    ['id' => Str::uuid(), 'name' => 'APICS CPIM', 'issuer' => 'APICS', 'date' => '2013-04'],
                    ['id' => Str::uuid(), 'name' => 'Six Sigma Black Belt', 'issuer' => 'ASQ', 'date' => '2016-09'],
                ],
            ],
            [
                'name' => 'Occupational Therapist',
                'template' => 'minimal',
                'summary' => 'Licensed OT with 8 years in pediatric outpatient settings, specializing in sensory processing, handwriting, and school-based consultation.',
                'contact' => ['full_name' => 'Richard Method', 'email' => 'richard@example.com', 'phone' => '555-0215', 'location' => 'Minneapolis, MN', 'linkedin' => '', 'website' => ''],
                'experience' => [
                    ['id' => Str::uuid(), 'company' => 'Children\'s Minnesota', 'title' => 'Occupational Therapist II', 'start_date' => 'Sep 2019', 'end_date' => '', 'current' => true, 'bullets' => "Treat 22 pediatric clients weekly across sensory, fine motor, and self-care goals\nDeveloped sensory diet protocols adopted by 3 additional OT staff\nCollaborate with school teams on IEP development for 35+ students annually"],
                    ['id' => Str::uuid(), 'company' => 'Courage Kenny Rehabilitation', 'title' => 'Occupational Therapist', 'start_date' => 'Aug 2016', 'end_date' => 'Aug 2019', 'current' => false, 'bullets' => "Provided outpatient OT for pediatric and adult neurological diagnoses\nCompleted 200-hour SI certification training under Dr. Lucy Jane Miller\nContributed to department's CARF accreditation renewal process"],
                ],
                'education' => [
                    ['id' => Str::uuid(), 'school' => 'University of Minnesota', 'degree' => 'M.O.T.', 'field' => 'Occupational Therapy', 'grad_year' => '2016'],
                ],
                'skills' => ['Sensory Integration', 'Pediatric OT', 'IEP Consultation', 'Fine Motor', 'Handwriting Without Tears', 'DIR/Floortime'],
                'certifications' => [
                    ['id' => Str::uuid(), 'name' => 'OTR/L — MN Licensed', 'issuer' => 'MN Board of OT', 'date' => '2016-09'],
                    ['id' => Str::uuid(), 'name' => 'Sensory Integration Certificate', 'issuer' => 'SIPT', 'date' => '2018-06'],
                ],
            ],
            [
                'name' => 'Architect — Commercial',
                'template' => 'classic',
                'summary' => 'Licensed architect with 16 years of experience in commercial, mixed-use, and healthcare design from schematic through construction administration.',
                'contact' => ['full_name' => 'Richard Method', 'email' => 'richard@example.com', 'phone' => '555-0216', 'location' => 'Boston, MA', 'linkedin' => 'linkedin.com/in/richardmethod', 'website' => ''],
                'experience' => [
                    ['id' => Str::uuid(), 'company' => 'Gensler', 'title' => 'Associate Principal', 'start_date' => 'Jun 2016', 'end_date' => '', 'current' => true, 'bullets' => "Led design of $85M mixed-use development in Boston\'s Seaport District\nManaged project team of 12 architects and designers\nSecured LEED Gold certification on 3 consecutive commercial projects"],
                    ['id' => Str::uuid(), 'company' => 'HDR Architecture', 'title' => 'Project Architect', 'start_date' => 'Aug 2008', 'end_date' => 'May 2016', 'current' => false, 'bullets' => "Designed 200-bed hospital addition navigating complex FGI Guidelines\nProduced CDs for 14 commercial projects totaling $280M in construction value\nMentored 5 interns through IDP requirements toward licensure"],
                ],
                'education' => [
                    ['id' => Str::uuid(), 'school' => 'Harvard GSD', 'degree' => 'M.Arch.', 'field' => 'Architecture', 'grad_year' => '2008'],
                    ['id' => Str::uuid(), 'school' => 'Cornell University', 'degree' => 'B.Arch.', 'field' => 'Architecture', 'grad_year' => '2006'],
                ],
                'skills' => ['Revit', 'AutoCAD', 'Rhino', 'Grasshopper', 'LEED', 'FGI Guidelines', 'Project Management'],
                'certifications' => [
                    ['id' => Str::uuid(), 'name' => 'Licensed Architect (MA)', 'issuer' => 'MA ABCEP', 'date' => '2010-08'],
                    ['id' => Str::uuid(), 'name' => 'LEED AP BD+C', 'issuer' => 'USGBC', 'date' => '2012-03'],
                ],
            ],
            [
                'name' => 'Veterinarian — Small Animal',
                'template' => 'minimal',
                'summary' => 'DVM with 10 years in small animal general practice and emergency medicine. Skilled in soft tissue surgery, dentistry, and client communication.',
                'contact' => ['full_name' => 'Richard Method', 'email' => 'richard@example.com', 'phone' => '555-0217', 'location' => 'Portland, OR', 'linkedin' => '', 'website' => ''],
                'experience' => [
                    ['id' => Str::uuid(), 'company' => 'Cascade Veterinary Clinic', 'title' => 'Associate Veterinarian', 'start_date' => 'May 2019', 'end_date' => '', 'current' => true, 'bullets' => "Examine and treat 20+ patients daily across preventive care, surgery, and dentistry\nPerform 8–10 soft tissue surgeries weekly with <1% complication rate\nMentor new-graduate DVMs on client communication and case management"],
                    ['id' => Str::uuid(), 'company' => 'BluePearl Emergency Pet Hospital', 'title' => 'Emergency Clinician', 'start_date' => 'Jun 2014', 'end_date' => 'Apr 2019', 'current' => false, 'bullets' => "Staffed overnight ER managing 30+ cases per shift at 24-hour referral hospital\nPerformed GDV, urethral obstruction, and trauma stabilization procedures\nAchieved 94% client satisfaction score in emergency setting"],
                ],
                'education' => [
                    ['id' => Str::uuid(), 'school' => 'Oregon State University CVM', 'degree' => 'D.V.M.', 'field' => 'Veterinary Medicine', 'grad_year' => '2014'],
                ],
                'skills' => ['Small Animal Surgery', 'Dental Radiography', 'Ultrasound', 'Emergency Medicine', 'Anesthesia', 'Client Education'],
                'certifications' => [
                    ['id' => Str::uuid(), 'name' => 'OR Veterinary License', 'issuer' => 'Oregon VME', 'date' => '2014-07'],
                ],
            ],
            [
                'name' => 'iOS Developer',
                'template' => 'modern',
                'summary' => 'Swift developer with 9 years shipping consumer iOS apps with millions of downloads. Deep expertise in UIKit, SwiftUI, and Core Data.',
                'contact' => ['full_name' => 'Richard Method', 'email' => 'richard@example.com', 'phone' => '555-0218', 'location' => 'San Francisco, CA', 'linkedin' => 'linkedin.com/in/richardmethod', 'website' => 'github.com/rmethod'],
                'experience' => [
                    ['id' => Str::uuid(), 'company' => 'Headspace', 'title' => 'Senior iOS Engineer', 'start_date' => 'Apr 2020', 'end_date' => '', 'current' => true, 'bullets' => "Own core meditation player reaching 3M daily active users\nMigrated UIKit codebase to SwiftUI, reducing view layer LOC by 35%\nImproved app launch time by 1.2 seconds via startup dependency analysis"],
                    ['id' => Str::uuid(), 'company' => 'Lyft', 'title' => 'iOS Engineer', 'start_date' => 'Aug 2015', 'end_date' => 'Mar 2020', 'current' => false, 'bullets' => "Built driver-facing navigation features used by 1.4M active drivers\nLed modularization initiative splitting monolithic app into 22 Swift packages\nReduced crash rate from 0.8% to 0.04% through systematic error handling audit"],
                ],
                'education' => [
                    ['id' => Str::uuid(), 'school' => 'University of Southern California', 'degree' => 'B.S.', 'field' => 'Computer Science', 'grad_year' => '2015'],
                ],
                'skills' => ['Swift', 'SwiftUI', 'UIKit', 'Core Data', 'Combine', 'XCTest', 'Instruments', 'App Store Connect'],
                'certifications' => [],
            ],
            [
                'name' => 'Speech-Language Pathologist',
                'template' => 'minimal',
                'summary' => 'CCC-SLP with 11 years in medical settings treating adult dysphagia, aphasia, and voice disorders in acute care and outpatient environments.',
                'contact' => ['full_name' => 'Richard Method', 'email' => 'richard@example.com', 'phone' => '555-0219', 'location' => 'Baltimore, MD', 'linkedin' => '', 'website' => ''],
                'experience' => [
                    ['id' => Str::uuid(), 'company' => 'Johns Hopkins Hospital', 'title' => 'Speech-Language Pathologist III', 'start_date' => 'Oct 2017', 'end_date' => '', 'current' => true, 'bullets' => "Evaluate and treat 15 inpatients daily on neurology and head & neck oncology units\nPerform MBSS and FEES procedures for complex dysphagia population\nLead department journal club and present at 2 national conferences annually"],
                    ['id' => Str::uuid(), 'company' => 'University of Maryland Medical Center', 'title' => 'SLP — Acute Care', 'start_date' => 'Sep 2013', 'end_date' => 'Sep 2017', 'current' => false, 'bullets' => "Covered neuro ICU, stroke unit, and acute care floors\nDeveloped bedside dysphagia screening protocol adopted hospital-wide\nPrecepted 8 SLP graduate students through clinical placements"],
                ],
                'education' => [
                    ['id' => Str::uuid(), 'school' => 'University of Maryland', 'degree' => 'M.S.', 'field' => 'Speech-Language Pathology', 'grad_year' => '2013'],
                ],
                'skills' => ['Dysphagia', 'MBSS', 'FEES', 'Aphasia', 'Voice Disorders', 'AAC', 'Acute Care SLP'],
                'certifications' => [
                    ['id' => Str::uuid(), 'name' => 'CCC-SLP', 'issuer' => 'ASHA', 'date' => '2013-10'],
                    ['id' => Str::uuid(), 'name' => 'MD SLP License', 'issuer' => 'MD DHMH', 'date' => '2013-11'],
                ],
            ],
            [
                'name' => 'Investment Banker — M&A',
                'template' => 'classic',
                'summary' => 'VP-level M&A banker with 11 years advising on middle-market sell-side and buy-side transactions across technology and healthcare verticals.',
                'contact' => ['full_name' => 'Richard Method', 'email' => 'richard@example.com', 'phone' => '555-0220', 'location' => 'New York, NY', 'linkedin' => 'linkedin.com/in/richardmethod', 'website' => ''],
                'experience' => [
                    ['id' => Str::uuid(), 'company' => 'Houlihan Lokey', 'title' => 'Vice President, M&A Advisory', 'start_date' => 'Jan 2019', 'end_date' => '', 'current' => true, 'bullets' => "Executed 14 sell-side transactions totaling $3.2B in aggregate deal value\nLed financial modeling and valuation for 6 healthcare services sell-side mandates\nManaged 4-person deal team through 120-day full-sale processes"],
                    ['id' => Str::uuid(), 'company' => 'Harris Williams', 'title' => 'Associate, Technology Group', 'start_date' => 'Jul 2013', 'end_date' => 'Dec 2018', 'current' => false, 'bullets' => "Supported 22 closed transactions in SaaS, cybersecurity, and data analytics\nBuilt 3-statement models and LBO analyses for 30+ IOI/LOI submissions\nDraft and present CIMs, management presentations, and process letters"],
                ],
                'education' => [
                    ['id' => Str::uuid(), 'school' => 'Wharton School, University of Pennsylvania', 'degree' => 'B.S.', 'field' => 'Economics (Finance)', 'grad_year' => '2013'],
                ],
                'skills' => ['M&A Advisory', 'LBO Modeling', 'DCF Valuation', 'CIM Drafting', 'Capital Markets', 'Excel', 'PowerPoint'],
                'certifications' => [
                    ['id' => Str::uuid(), 'name' => 'Series 79 (Investment Banking)', 'issuer' => 'FINRA', 'date' => '2013-09'],
                    ['id' => Str::uuid(), 'name' => 'Series 63', 'issuer' => 'FINRA', 'date' => '2013-10'],
                ],
            ],
            [
                'name' => 'Environmental Scientist',
                'template' => 'modern',
                'summary' => 'Environmental scientist with 12 years in Phase I/II site assessments, CERCLA remediation oversight, and regulatory compliance for industrial clients.',
                'contact' => ['full_name' => 'Richard Method', 'email' => 'richard@example.com', 'phone' => '555-0221', 'location' => 'Houston, TX', 'linkedin' => 'linkedin.com/in/richardmethod', 'website' => ''],
                'experience' => [
                    ['id' => Str::uuid(), 'company' => 'Terracon Consultants', 'title' => 'Senior Environmental Scientist', 'start_date' => 'Jun 2017', 'end_date' => '', 'current' => true, 'bullets' => "Managed Phase I/II ESAs for $2.1B commercial real estate portfolio\nLed multi-year CERCLA remediation at former petrochemical facility\nPrepared RCRA, NPDES, and TCEQ compliance reports for 25 industrial clients"],
                    ['id' => Str::uuid(), 'company' => 'ERM Group', 'title' => 'Environmental Consultant', 'start_date' => 'Aug 2012', 'end_date' => 'May 2017', 'current' => false, 'bullets' => "Conducted soil and groundwater investigations at 40+ petroleum-impacted sites\nSupported voluntary cleanup program negotiations with TCEQ\nPublished groundwater fate-and-transport modeling results in peer review"],
                ],
                'education' => [
                    ['id' => Str::uuid(), 'school' => 'Texas A&M University', 'degree' => 'M.S.', 'field' => 'Environmental Science', 'grad_year' => '2012'],
                    ['id' => Str::uuid(), 'school' => 'University of Texas at Austin', 'degree' => 'B.S.', 'field' => 'Geology', 'grad_year' => '2010'],
                ],
                'skills' => ['Phase I/II ESA', 'CERCLA', 'RCRA', 'MODFLOW', 'ArcGIS', 'TCEQ Regulations', 'Remediation Design'],
                'certifications' => [
                    ['id' => Str::uuid(), 'name' => 'Licensed Professional Geoscientist (TX)', 'issuer' => 'Texas BOG', 'date' => '2015-06'],
                    ['id' => Str::uuid(), 'name' => '40-Hour HAZWOPER', 'issuer' => 'OSHA', 'date' => '2012-08'],
                ],
            ],
            [
                'name' => 'Physical Therapist — Sports',
                'template' => 'minimal',
                'summary' => 'Sports PT with 9 years treating elite and recreational athletes. Certified in dry needling, ASTYM, and ACL return-to-sport protocols.',
                'contact' => ['full_name' => 'Richard Method', 'email' => 'richard@example.com', 'phone' => '555-0222', 'location' => 'Denver, CO', 'linkedin' => '', 'website' => ''],
                'experience' => [
                    ['id' => Str::uuid(), 'company' => 'Peak Performance Sports PT', 'title' => 'Physical Therapist / Clinic Director', 'start_date' => 'Jan 2020', 'end_date' => '', 'current' => true, 'bullets' => "Treat 18 patients daily with emphasis on post-surgical orthopedic rehab\nDirected clinic operations, growing revenue 32% in 3 years\nContract PT for Colorado Rapids MLS Academy program"],
                    ['id' => Str::uuid(), 'company' => 'ATI Physical Therapy', 'title' => 'Physical Therapist', 'start_date' => 'Jun 2015', 'end_date' => 'Dec 2019', 'current' => false, 'bullets' => "Managed 20-patient daily caseload in outpatient ortho and sports setting\nAchieved 4.9/5.0 patient satisfaction average across 2,400 visits\nCompleted 120-hour residency in orthopaedic manual therapy"],
                ],
                'education' => [
                    ['id' => Str::uuid(), 'school' => 'Regis University', 'degree' => 'D.P.T.', 'field' => 'Physical Therapy', 'grad_year' => '2015'],
                ],
                'skills' => ['Sports Rehab', 'Dry Needling', 'ASTYM', 'ACL Return-to-Sport', 'Manual Therapy', 'Blood Flow Restriction'],
                'certifications' => [
                    ['id' => Str::uuid(), 'name' => 'CO Physical Therapy License', 'issuer' => 'CO DORA', 'date' => '2015-07'],
                    ['id' => Str::uuid(), 'name' => 'Cert. Dry Needling', 'issuer' => 'Kinetacore', 'date' => '2017-04'],
                ],
            ],
            [
                'name' => 'Tax Attorney',
                'template' => 'classic',
                'summary' => 'JD/LLM tax attorney with 13 years in corporate tax planning, international transfer pricing, and IRS controversy work at Big Law.',
                'contact' => ['full_name' => 'Richard Method', 'email' => 'richard@example.com', 'phone' => '555-0223', 'location' => 'Washington, DC', 'linkedin' => 'linkedin.com/in/richardmethod', 'website' => ''],
                'experience' => [
                    ['id' => Str::uuid(), 'company' => 'Caplin & Drysdale', 'title' => 'Senior Associate, Tax', 'start_date' => 'Sep 2017', 'end_date' => '', 'current' => true, 'bullets' => "Represent Fortune 500 clients in IRS audits, appeals, and Tax Court litigation\nAdvise on international restructurings and BEAT/GILTI planning strategies\nLed team securing $220M refund claim for manufacturing client"],
                    ['id' => Str::uuid(), 'company' => 'Baker McKenzie', 'title' => 'Associate, International Tax', 'start_date' => 'Sep 2011', 'end_date' => 'Aug 2017', 'current' => false, 'bullets' => "Structured cross-border M&A transactions with aggregate value exceeding $8B\nDrafted transfer pricing documentation for 30+ intercompany arrangements\nPublished 4 articles on OECD BEPS framework in Tax Notes International"],
                ],
                'education' => [
                    ['id' => Str::uuid(), 'school' => 'Georgetown University Law Center', 'degree' => 'LL.M.', 'field' => 'Taxation', 'grad_year' => '2011'],
                    ['id' => Str::uuid(), 'school' => 'University of Virginia School of Law', 'degree' => 'J.D.', 'field' => 'Law', 'grad_year' => '2010'],
                ],
                'skills' => ['IRS Controversy', 'Transfer Pricing', 'BEAT/GILTI', 'M&A Tax', 'Tax Court Litigation', 'OECD BEPS'],
                'certifications' => [
                    ['id' => Str::uuid(), 'name' => 'DC Bar', 'issuer' => 'DC Court of Appeals', 'date' => '2011-10'],
                    ['id' => Str::uuid(), 'name' => 'VA Bar', 'issuer' => 'Virginia State Bar', 'date' => '2011-10'],
                ],
            ],
            [
                'name' => 'Airline Pilot — Commercial',
                'template' => 'classic',
                'summary' => 'ATP-certified airline transport pilot with 8,400 hours total time, type-rated on Boeing 737 and Airbus A320. Current First Officer at major US carrier.',
                'contact' => ['full_name' => 'Richard Method', 'email' => 'richard@example.com', 'phone' => '555-0224', 'location' => 'Dallas, TX', 'linkedin' => '', 'website' => ''],
                'experience' => [
                    ['id' => Str::uuid(), 'company' => 'American Airlines', 'title' => 'First Officer, Boeing 737', 'start_date' => 'Mar 2018', 'end_date' => '', 'current' => true, 'bullets' => "Operate B737-800/MAX on domestic and international routes\nComplete annual 737 type recurrency and Advanced Qualification Program training\nVolunteer line check airman mentor for new hire pilots"],
                    ['id' => Str::uuid(), 'company' => 'SkyWest Airlines', 'title' => 'First Officer, CRJ-200/700', 'start_date' => 'Jan 2014', 'end_date' => 'Feb 2018', 'current' => false, 'bullets' => "Accumulated 4,200 hours on CRJ-200 and CRJ-700 aircraft\nMaintained zero incident/accident record over 4-year tenure\nSelected as peer mentor for new hire class of 24 pilots"],
                ],
                'education' => [
                    ['id' => Str::uuid(), 'school' => 'Embry-Riddle Aeronautical University', 'degree' => 'B.S.', 'field' => 'Aeronautical Science', 'grad_year' => '2013'],
                ],
                'skills' => ['Boeing 737', 'Airbus A320', 'CRM', 'IFR Operations', 'RNAV/RNP', 'ETOPS', 'SMS'],
                'certifications' => [
                    ['id' => Str::uuid(), 'name' => 'Airline Transport Pilot Certificate (ATP)', 'issuer' => 'FAA', 'date' => '2013-12'],
                    ['id' => Str::uuid(), 'name' => 'Boeing 737 Type Rating', 'issuer' => 'FAA', 'date' => '2018-03'],
                ],
            ],
            [
                'name' => 'Accountant — Corporate',
                'template' => 'minimal',
                'summary' => 'CPA with 10 years in corporate accounting, financial reporting, and SOX compliance at publicly traded companies.',
                'contact' => ['full_name' => 'Richard Method', 'email' => 'richard@example.com', 'phone' => '555-0225', 'location' => 'Columbus, OH', 'linkedin' => 'linkedin.com/in/richardmethod', 'website' => ''],
                'experience' => [
                    ['id' => Str::uuid(), 'company' => 'Nationwide Insurance', 'title' => 'Senior Accountant — External Reporting', 'start_date' => 'Jul 2019', 'end_date' => '', 'current' => true, 'bullets' => "Prepare 10-K, 10-Q, and 8-K filings for $8B publicly traded insurer\nCoordinate quarterly close process across 6 business units\nLed ASC 842 lease accounting implementation, remediating 12 control gaps"],
                    ['id' => Str::uuid(), 'company' => 'Deloitte', 'title' => 'Senior Audit Associate', 'start_date' => 'Sep 2014', 'end_date' => 'Jun 2019', 'current' => false, 'bullets' => "Audited financial statements for 5 public company clients in insurance and banking\nTested SOX controls for revenue recognition and financial instruments\nSupervised 2 staff associates through busy season audit execution"],
                ],
                'education' => [
                    ['id' => Str::uuid(), 'school' => 'Ohio State University', 'degree' => 'B.S.', 'field' => 'Accounting', 'grad_year' => '2014'],
                ],
                'skills' => ['SEC Reporting', 'SOX Compliance', 'US GAAP', 'SAP', 'Workiva', 'Excel', 'Financial Close'],
                'certifications' => [
                    ['id' => Str::uuid(), 'name' => 'CPA — Ohio', 'issuer' => 'Ohio Accountancy Board', 'date' => '2016-05'],
                ],
            ],
        ];

        // Link labels for variety
        $linkLabels = [
            'Recruiter Link', 'LinkedIn Share', 'Email Campaign', 'Job Application — Tech',
            'Job Application — Finance', 'Referral Link', 'Headhunter Share', 'Public Profile',
            'Agency Submission', 'Conference Share', 'Alumni Network', 'Direct Share',
        ];

        // Pool of 15 fake IPs to simulate repeat visitors
        $ips = [];
        for ($i = 1; $i <= 15; $i++) {
            $ips[] = "10.{$i}.".rand(0, 255).'.'.rand(1, 254);
        }

        $userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/121.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) AppleWebKit/605.1.15 Safari/605.1.15',
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',
            'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/121.0 Mobile Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Firefox/122.0',
        ];

        $referrers = [
            'https://www.linkedin.com/jobs/',
            'https://mail.google.com/',
            'https://www.indeed.com/',
            '',
            'https://www.glassdoor.com/',
            'https://www.ziprecruiter.com/',
            '',
            'https://t.co/',
        ];

        $now = Carbon::now();

        foreach ($resumes as $resumeData) {
            $skills = $resumeData['skills'] ?? [];
            $certifications = $resumeData['certifications'] ?? [];
            $contact = $resumeData['contact'] ?? null;
            $experience = $resumeData['experience'] ?? [];
            $education = $resumeData['education'] ?? [];

            $resume = $user->resumes()->create([
                'name' => $resumeData['name'],
                'template' => $resumeData['template'],
                'summary' => $resumeData['summary'],
                'contact' => $contact,
                'experience' => $experience,
                'education' => $education,
                'skills' => $skills,
                'certifications' => $certifications,
                'pdf_filename' => Str::uuid().'.pdf',
            ]);

            // 2–4 share links per resume
            $linkCount = rand(2, 4);
            $usedLabels = [];

            for ($l = 0; $l < $linkCount; $l++) {
                // Pick a unique label for this resume
                do {
                    $label = $linkLabels[array_rand($linkLabels)];
                } while (in_array($label, $usedLabels));
                $usedLabels[] = $label;

                $link = ResumeShareLink::create([
                    'resume_id' => $resume->id,
                    'token' => Str::random(48),
                    'label' => $label,
                    'is_active' => true,
                ]);

                // 25–100 visits spread over last 30 days
                $visitCount = rand(25, 100);

                for ($v = 0; $v < $visitCount; $v++) {
                    // Random timestamp within last 30 days
                    $daysAgo = rand(0, 29);
                    $hoursAgo = rand(0, 23);
                    $minutesAgo = rand(0, 59);
                    $eventTime = $now->copy()
                        ->subDays($daysAgo)
                        ->subHours($hoursAgo)
                        ->subMinutes($minutesAgo);

                    $ip = $ips[array_rand($ips)];

                    // Weighted event type: ~75% page_view, ~15% pdf_download, ~10% question_submitted
                    $rand = rand(1, 100);
                    if ($rand <= 75) {
                        $event = 'page_view';
                    } elseif ($rand <= 90) {
                        $event = 'pdf_download';
                    } else {
                        $event = 'question_submitted';
                    }

                    DB::table('resume_share_events')->insert([
                        'resume_share_link_id' => $link->id,
                        'resume_id' => $resume->id,
                        'event' => $event,
                        'ip_hash' => hash('sha256', $ip),
                        'user_agent' => $userAgents[array_rand($userAgents)],
                        'referrer' => $referrers[array_rand($referrers)] ?: null,
                        'created_at' => $eventTime->toDateTimeString(),
                    ]);
                }
            }
        }
    }
}
