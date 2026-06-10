<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class JobSkillsSeeder extends Seeder
{
    public function run(): void
    {
        $skills = [
            // ─── Programming Languages ───────────────────────────────────────
            'Programming Languages' => [
                'Python', 'JavaScript', 'TypeScript', 'Java', 'C', 'C++', 'C#', 'Go', 'Rust',
                'Ruby', 'PHP', 'Swift', 'Kotlin', 'Scala', 'R', 'MATLAB', 'Perl', 'Bash',
                'Shell Scripting', 'Lua', 'Dart', 'Elixir', 'Haskell', 'Julia', 'Objective-C',
                'Assembly', 'COBOL', 'Fortran', 'Groovy', 'F#', 'Clojure', 'Erlang', 'Zig',
                'PowerShell', 'Visual Basic', 'Delphi', 'PL/SQL', 'T-SQL',
            ],

            // ─── Web Frontend ────────────────────────────────────────────────
            'Web Frontend' => [
                'React', 'Vue.js', 'Angular', 'Svelte', 'Next.js', 'Nuxt.js', 'Remix',
                'HTML5', 'CSS3', 'Sass/SCSS', 'Tailwind CSS', 'Bootstrap', 'Material UI',
                'Chakra UI', 'jQuery', 'GraphQL', 'REST APIs', 'WebSockets', 'WebAssembly',
                'Webpack', 'Vite', 'Parcel', 'Storybook', 'Responsive Design',
                'Cross-Browser Compatibility', 'Web Accessibility (WCAG)', 'PWA',
                'Web Components', 'Redux', 'Zustand', 'Tanstack Query', 'Framer Motion',
                'Three.js', 'D3.js', 'Chart.js',
            ],

            // ─── Web Backend ─────────────────────────────────────────────────
            'Web Backend' => [
                'Node.js', 'Express.js', 'NestJS', 'Laravel', 'Django', 'Flask', 'FastAPI',
                'Spring Boot', 'Ruby on Rails', 'ASP.NET Core', 'Phoenix', 'Gin', 'Fiber',
                'Symfony', 'CodeIgniter', 'Fastify', 'Hapi.js', 'gRPC', 'GraphQL APIs',
                'RESTful API Design', 'Microservices', 'Serverless', 'OAuth / OpenID Connect',
                'JWT Authentication', 'WebSockets', 'Message Queues', 'API Gateway',
                'Middleware Design', 'Background Jobs', 'Caching Strategies',
            ],

            // ─── Databases ───────────────────────────────────────────────────
            'Databases' => [
                'MySQL', 'PostgreSQL', 'SQLite', 'MariaDB', 'Oracle Database', 'SQL Server',
                'MongoDB', 'Redis', 'Elasticsearch', 'Cassandra', 'DynamoDB', 'Firebase',
                'Supabase', 'Neo4j', 'InfluxDB', 'CouchDB', 'Couchbase', 'TimescaleDB',
                'Snowflake', 'BigQuery', 'Amazon RDS', 'Aurora', 'PlanetScale',
                'Database Design', 'Query Optimization', 'Indexing', 'Database Migrations',
                'Replication & Sharding', 'ORM Frameworks', 'Vector Databases',
            ],

            // ─── DevOps & Cloud ───────────────────────────────────────────────
            'DevOps & Cloud' => [
                'Docker', 'Kubernetes', 'Helm', 'AWS', 'Google Cloud Platform', 'Microsoft Azure',
                'Terraform', 'Ansible', 'Pulumi', 'CI/CD Pipelines', 'GitHub Actions',
                'GitLab CI', 'Jenkins', 'CircleCI', 'ArgoCD', 'Nginx', 'Apache',
                'Linux Administration', 'Bash Scripting', 'Prometheus', 'Grafana', 'Datadog',
                'New Relic', 'ELK Stack', 'Site Reliability Engineering', 'Infrastructure as Code',
                'Service Mesh (Istio)', 'Load Balancing', 'Auto Scaling', 'CDN',
                'Disaster Recovery', 'Monitoring & Alerting', 'Cost Optimisation',
            ],

            // ─── Data Science & Analytics ─────────────────────────────────────
            'Data Science & Analytics' => [
                'Machine Learning', 'Deep Learning', 'Statistical Analysis', 'Data Wrangling',
                'Feature Engineering', 'Model Evaluation', 'A/B Testing', 'Hypothesis Testing',
                'Regression Analysis', 'Classification', 'Clustering', 'Dimensionality Reduction',
                'Time Series Analysis', 'Natural Language Processing', 'Computer Vision',
                'Reinforcement Learning', 'Recommendation Systems', 'Anomaly Detection',
                'TensorFlow', 'PyTorch', 'Keras', 'scikit-learn', 'XGBoost', 'LightGBM',
                'Pandas', 'NumPy', 'SciPy', 'Matplotlib', 'Seaborn', 'Plotly',
                'Jupyter Notebooks', 'Apache Spark', 'Hadoop', 'Kafka', 'Airflow',
                'dbt', 'MLOps', 'Model Deployment', 'Data Pipelines', 'ETL/ELT',
                'Power BI', 'Tableau', 'Looker', 'Google Data Studio', 'Excel (Advanced)',
                'SQL for Analytics', 'Google Analytics', 'Mixpanel', 'Amplitude',
            ],

            // ─── AI & Generative AI ────────────────────────────────────────────
            'AI & Generative AI' => [
                'Prompt Engineering', 'LLM Fine-tuning', 'LangChain', 'LlamaIndex',
                'Retrieval-Augmented Generation (RAG)', 'OpenAI API', 'Anthropic API',
                'Hugging Face', 'Diffusion Models', 'Embeddings', 'Vector Databases',
                'AI Agents', 'Function Calling', 'AI Ethics', 'Responsible AI',
                'Model Evaluation', 'AI Safety', 'Multimodal AI', 'AI Automation',
                'AI Product Strategy', 'Computer Use', 'MCP (Model Context Protocol)',
            ],

            // ─── Cybersecurity ────────────────────────────────────────────────
            'Cybersecurity' => [
                'Penetration Testing', 'Vulnerability Assessment', 'Ethical Hacking',
                'Network Security', 'Application Security', 'Cloud Security',
                'Incident Response', 'Threat Modelling', 'SIEM', 'SOC Operations',
                'Cryptography', 'PKI', 'Firewall Management', 'IDS/IPS',
                'Zero Trust Architecture', 'Identity & Access Management',
                'OWASP Top 10', 'NIST Framework', 'ISO 27001', 'GDPR Compliance',
                'Malware Analysis', 'Digital Forensics', 'Bug Bounty', 'Red Teaming',
                'Blue Teaming', 'Security Auditing', 'DevSecOps',
            ],

            // ─── Mobile Development ───────────────────────────────────────────
            'Mobile Development' => [
                'iOS Development', 'Android Development', 'React Native', 'Flutter',
                'SwiftUI', 'UIKit', 'Jetpack Compose', 'Kotlin Multiplatform',
                'Xamarin', 'Ionic', 'Capacitor', 'Expo', 'App Store Optimisation',
                'Mobile UI/UX', 'Push Notifications', 'Offline-First Design',
                'In-App Purchases', 'Deep Linking', 'Mobile Analytics',
                'Mobile Security', 'TestFlight', 'Firebase (Mobile)',
            ],

            // ─── Project & Product Management ─────────────────────────────────
            'Project & Product Management' => [
                'Agile', 'Scrum', 'Kanban', 'SAFe', 'Waterfall', 'PRINCE2', 'PMP',
                'Product Roadmapping', 'Backlog Refinement', 'Sprint Planning',
                'OKRs', 'KPI Tracking', 'Stakeholder Management', 'Risk Management',
                'Change Management', 'Resource Planning', 'Budget Management',
                'Jira', 'Confluence', 'Asana', 'Monday.com', 'Notion', 'Linear',
                'MS Project', 'User Story Mapping', 'Go-to-Market Strategy',
                'Product Discovery', 'A/B Testing', 'Feature Prioritisation (MoSCoW / RICE)',
                'Data-Driven Decision Making', 'Competitive Analysis',
            ],

            // ─── UX / Design ──────────────────────────────────────────────────
            'UX & Design' => [
                'Figma', 'Adobe XD', 'Sketch', 'InVision', 'Framer', 'Webflow',
                'Adobe Photoshop', 'Adobe Illustrator', 'Adobe InDesign',
                'Adobe After Effects', 'Adobe Premiere Pro', 'Final Cut Pro',
                'Blender', 'Cinema 4D', 'AutoCAD', 'SolidWorks',
                'UX Research', 'Usability Testing', 'User Interviews', 'Personas',
                'Wireframing', 'Prototyping', 'Design Systems', 'Component Libraries',
                'Typography', 'Colour Theory', 'Grid Systems', 'Accessibility Design',
                'Motion Design', 'Video Editing', 'Photography', 'Brand Identity',
                'Illustration', 'Icon Design', 'Print Design', 'Packaging Design',
                '3D Modelling', 'UI Animation',
            ],

            // ─── Marketing ────────────────────────────────────────────────────
            'Marketing' => [
                'SEO', 'SEM / PPC', 'Google Ads', 'Meta Ads', 'LinkedIn Ads',
                'TikTok Ads', 'Programmatic Advertising', 'Email Marketing',
                'Marketing Automation', 'HubSpot', 'Marketo', 'Mailchimp',
                'Content Marketing', 'Social Media Marketing', 'Influencer Marketing',
                'Affiliate Marketing', 'Video Marketing', 'Podcast Marketing',
                'Copywriting', 'Brand Strategy', 'Product Marketing',
                'Demand Generation', 'Account-Based Marketing (ABM)',
                'Conversion Rate Optimisation', 'Landing Page Design',
                'Customer Segmentation', 'Market Research', 'Competitive Intelligence',
                'Google Analytics 4', 'CRM (Salesforce / HubSpot)', 'UTM Tracking',
                'Growth Hacking', 'Community Building', 'Event Marketing',
                'Public Relations', 'Press Release Writing', 'Thought Leadership',
            ],

            // ─── Sales ────────────────────────────────────────────────────────
            'Sales' => [
                'B2B Sales', 'B2C Sales', 'SaaS Sales', 'Enterprise Sales',
                'Account Management', 'Account Executive', 'Sales Development (SDR)',
                'Cold Calling', 'Cold Emailing', 'LinkedIn Outreach',
                'Lead Generation', 'Pipeline Management', 'Sales Forecasting',
                'CRM (Salesforce)', 'HubSpot CRM', 'Negotiation', 'Closing Techniques',
                'Customer Success', 'Upselling & Cross-Selling', 'Territory Management',
                'Channel Sales', 'Partnership Development', 'Demo Delivery',
                'Proposal Writing', 'Contract Management', 'Objection Handling',
                'SPIN Selling', 'MEDDIC', 'Challenger Sale',
            ],

            // ─── Finance & Accounting ─────────────────────────────────────────
            'Finance & Accounting' => [
                'Financial Modelling', 'DCF Analysis', 'Valuation', 'Budgeting',
                'Forecasting', 'Financial Analysis', 'FP&A', 'Management Accounting',
                'Financial Reporting', 'GAAP', 'IFRS', 'Tax Preparation', 'Tax Planning',
                'Auditing', 'Internal Controls', 'Accounts Payable', 'Accounts Receivable',
                'Payroll Processing', 'Cash Flow Management', 'Investment Analysis',
                'Portfolio Management', 'Risk Management', 'Treasury Management',
                'Mergers & Acquisitions', 'Due Diligence', 'Capital Markets',
                'Equity Research', 'Fixed Income', 'Derivatives', 'Hedge Fund Operations',
                'QuickBooks', 'Xero', 'SAP FI/CO', 'Oracle Financials', 'NetSuite',
                'Bloomberg Terminal', 'Excel (Advanced)', 'Python for Finance', 'SQL',
            ],

            // ─── Human Resources ──────────────────────────────────────────────
            'Human Resources' => [
                'Talent Acquisition', 'Recruiting', 'Boolean Search', 'LinkedIn Recruiter',
                'Applicant Tracking Systems (ATS)', 'Onboarding', 'Employee Relations',
                'Performance Management', 'Compensation & Benefits', 'Job Architecture',
                'Learning & Development', 'Instructional Design', 'Training Delivery',
                'Organisational Development', 'Succession Planning', 'HR Business Partnering',
                'Labour Relations', 'Employment Law', 'HRIS Administration',
                'Workday', 'BambooHR', 'ADP', 'SAP SuccessFactors', 'ServiceNow HR',
                'People Analytics', 'HR Reporting', 'Diversity, Equity & Inclusion',
                'Employee Engagement', 'Culture Building', 'Workforce Planning',
                'Change Management', 'HR Policy Writing',
            ],

            // ─── Healthcare & Clinical ─────────────────────────────────────────
            'Healthcare & Clinical' => [
                'Patient Care', 'Clinical Assessment', 'Medical Terminology', 'CPR / First Aid',
                'Medication Administration', 'Phlebotomy', 'IV Therapy', 'Wound Care',
                'Vital Signs Monitoring', 'Electronic Health Records (EHR)',
                'Epic', 'Cerner', 'Meditech', 'HIPAA Compliance', 'Clinical Documentation',
                'Medical Coding (ICD-10, CPT)', 'Medical Billing', 'Radiology',
                'Surgical Assistance', 'Anaesthesia Support', 'Physical Therapy',
                'Occupational Therapy', 'Speech Therapy', 'Mental Health Counselling',
                'Psychiatric Assessment', 'Telemedicine', 'Case Management',
                'Healthcare Analytics', 'Public Health', 'Infection Control',
                'Pharmacology', 'Lab Techniques', 'Diagnostic Imaging',
            ],

            // ─── Legal ────────────────────────────────────────────────────────
            'Legal' => [
                'Legal Research', 'Contract Drafting', 'Contract Review', 'Legal Writing',
                'Litigation Support', 'Discovery & eDiscovery', 'Case Management',
                'LexisNexis', 'Westlaw', 'Compliance', 'Regulatory Affairs',
                'Due Diligence', 'Corporate Law', 'M&A', 'Employment Law',
                'Intellectual Property', 'Patent Law', 'Trademark Registration',
                'Privacy Law (GDPR, CCPA)', 'Data Protection', 'Securities Law',
                'Bankruptcy Law', 'Real Estate Law', 'Family Law', 'Criminal Law',
                'Immigration Law', 'International Law', 'Arbitration', 'Mediation',
                'Paralegalism', 'Legal Operations', 'Contract Lifecycle Management',
            ],

            // ─── Operations & Supply Chain ─────────────────────────────────────
            'Operations & Supply Chain' => [
                'Supply Chain Management', 'Logistics', 'Inventory Management',
                'Demand Planning', 'Procurement', 'Vendor Management', 'Sourcing',
                'Category Management', 'Warehouse Management', 'Distribution',
                'Last-Mile Delivery', 'Freight Management', 'Import/Export Compliance',
                'Lean Manufacturing', 'Six Sigma', 'Kaizen', '5S Methodology',
                'ISO 9001', 'Quality Control', 'Quality Assurance', 'Process Improvement',
                'ERP Systems', 'SAP SCM', 'Oracle SCM', 'NetSuite', 'Dynamics 365',
                'Business Process Mapping', 'SOP Development', 'Capacity Planning',
                'Facilities Management', 'Health & Safety (OSHA)',
            ],

            // ─── Customer Service & Support ────────────────────────────────────
            'Customer Service & Support' => [
                'Customer Support', 'Technical Support', 'Help Desk', 'Tier 1/2/3 Support',
                'Zendesk', 'Intercom', 'Freshdesk', 'Salesforce Service Cloud',
                'ServiceNow', 'LiveChat', 'Ticketing Systems', 'SLA Management',
                'Escalation Management', 'Customer Onboarding', 'Customer Retention',
                'NPS & CSAT Analysis', 'Knowledge Base Management',
                'CRM', 'Active Listening', 'De-escalation', 'Conflict Resolution',
                'Multi-channel Support (Email, Chat, Phone)', 'Community Management',
            ],

            // ─── Writing & Communications ──────────────────────────────────────
            'Writing & Communications' => [
                'Technical Writing', 'Copywriting', 'Content Writing', 'Ghostwriting',
                'Scriptwriting', 'Speechwriting', 'Grant Writing', 'Proposal Writing',
                'Academic Writing', 'Journalism', 'Investigative Reporting',
                'Editing & Proofreading', 'AP Style', 'Chicago Manual of Style',
                'Content Strategy', 'SEO Writing', 'UX Writing', 'Documentation',
                'API Documentation', 'White Papers', 'Case Studies', 'Press Releases',
                'Internal Communications', 'Crisis Communications',
                'Public Relations', 'Media Relations', 'Stakeholder Communications',
            ],

            // ─── Education & Training ──────────────────────────────────────────
            'Education & Training' => [
                'Curriculum Development', 'Lesson Planning', 'Instructional Design',
                'eLearning Development', 'SCORM', 'LMS Administration',
                'Articulate Storyline', 'Adobe Captivate', 'Canvas', 'Moodle',
                'Classroom Management', 'Differentiated Instruction',
                'Special Education', 'Assessment Design', 'Rubric Development',
                'Educational Technology', 'Google Classroom', 'Zoom Training',
                'Coaching', 'Mentoring', 'Train-the-Trainer', 'Workshop Facilitation',
                'Corporate Training', 'Compliance Training', 'Onboarding Programs',
            ],

            // ─── Engineering (Non-Software) ────────────────────────────────────
            'Engineering' => [
                'Mechanical Design', 'Electrical Engineering', 'Civil Engineering',
                'Structural Engineering', 'Chemical Engineering', 'Aerospace Engineering',
                'Manufacturing Engineering', 'Industrial Engineering',
                'AutoCAD', 'SolidWorks', 'CATIA', 'ANSYS', 'MATLAB/Simulink',
                'PLC Programming', 'SCADA Systems', 'PCB Design', 'Embedded Systems',
                'Signal Processing', 'Control Systems', 'Thermodynamics',
                'Finite Element Analysis', 'GD&T', 'Technical Drawing',
                'Hydraulics & Pneumatics', 'Robotics', 'Automation', 'IoT',
            ],

            // ─── Architecture & Construction ────────────────────────────────────
            'Architecture & Construction' => [
                'Architectural Design', 'AutoCAD', 'Revit', 'BIM', 'SketchUp',
                'Rhino', 'ArchiCAD', '3ds Max', 'Lumion', 'V-Ray',
                'Construction Management', 'Project Scheduling (Primavera, MS Project)',
                'Quantity Surveying', 'Cost Estimation', 'Building Codes',
                'Zoning Regulations', 'Site Management', 'Subcontractor Management',
                'LEED Certification', 'Sustainable Design', 'Interior Design',
                'Landscape Architecture', 'Urban Planning', 'Structural Analysis',
            ],

            // ─── Science & Research ────────────────────────────────────────────
            'Science & Research' => [
                'Research Design', 'Literature Review', 'Data Collection',
                'Qualitative Research', 'Quantitative Research', 'Statistical Modelling',
                'Grant Writing', 'Scientific Writing', 'Lab Techniques',
                'PCR', 'Cell Culture', 'Microscopy', 'Spectroscopy', 'Chromatography',
                'Genomics', 'Bioinformatics', 'Clinical Trials', 'GCP', 'GLP', 'GMP',
                'R', 'SPSS', 'SAS', 'Python (Scientific)', 'ImageJ',
                'Peer Review', 'Conference Presentations', 'Technical Reporting',
            ],

            // ─── Finance (Specialist) ──────────────────────────────────────────
            'FinTech & Quantitative Finance' => [
                'Algorithmic Trading', 'Quantitative Analysis', 'Options Pricing',
                'Risk Modelling', 'Monte Carlo Simulation', 'Backtesting',
                'Blockchain', 'Smart Contracts', 'Solidity', 'DeFi',
                'Cryptocurrency Trading', 'Tokenisation', 'Payment Processing',
                'Open Banking', 'RegTech', 'AML / KYC Compliance',
                'FIX Protocol', 'Bloomberg API', 'QuantLib', 'VBA (Finance)',
            ],

            // ─── Soft Skills ───────────────────────────────────────────────────
            'Soft Skills' => [
                'Leadership', 'Communication', 'Teamwork & Collaboration',
                'Problem Solving', 'Critical Thinking', 'Creativity', 'Innovation',
                'Adaptability', 'Resilience', 'Time Management', 'Prioritisation',
                'Emotional Intelligence', 'Empathy', 'Active Listening',
                'Conflict Resolution', 'Negotiation', 'Persuasion', 'Storytelling',
                'Presentation Skills', 'Public Speaking', 'Facilitation',
                'Mentoring', 'Coaching', 'Decision Making', 'Strategic Thinking',
                'Attention to Detail', 'Analytical Thinking', 'Data Literacy',
                'Growth Mindset', 'Self-Management', 'Accountability', 'Networking',
                'Cross-Cultural Communication', 'Remote Collaboration',
            ],

            // ─── Tools & Productivity ──────────────────────────────────────────
            'Tools & Productivity' => [
                'Microsoft Office (Word, Excel, PowerPoint)', 'Google Workspace',
                'Slack', 'Microsoft Teams', 'Zoom', 'Loom',
                'Notion', 'Obsidian', 'Confluence', 'SharePoint',
                'Trello', 'Asana', 'Monday.com', 'ClickUp', 'Basecamp',
                'Jira', 'Linear', 'GitHub', 'GitLab', 'Bitbucket',
                'Zapier', 'Make (Integromat)', 'n8n', 'Airtable',
                'Miro', 'Lucidchart', 'FigJam', 'Draw.io',
                'ChatGPT', 'Claude', 'Copilot', 'Gemini',
            ],
        ];

        $now = now();
        $rows = [];

        foreach ($skills as $category => $names) {
            foreach ($names as $name) {
                $rows[] = [
                    'category' => $category,
                    'name' => $name,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }
        }

        // Insert in chunks to avoid hitting SQLite variable limits
        foreach (array_chunk($rows, 200) as $chunk) {
            DB::table('job_skills')->upsert($chunk, ['category', 'name'], ['updated_at']);
        }

        $total = DB::table('job_skills')->count();
        $this->command->info("Seeded {$total} skills across ".count($skills).' categories.');
    }
}
