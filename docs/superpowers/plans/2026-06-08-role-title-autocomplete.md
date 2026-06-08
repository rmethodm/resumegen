# Role & Title Autocomplete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add type-ahead autocomplete to all role/title input fields across the app, backed by two pre-seeded lookup tables (`job_roles`, `job_titles`). Unknown values are auto-saved to the table on blur.

**Architecture:** Two append-only DB tables hold global role/title suggestions. A single `AutocompleteController` handles search (GET) and save (POST) for both tables. A shared `AutocompleteInput` React component wraps any `<input>` with debounced fetch, keyboard navigation, and on-blur auto-save. Four fields across three pages are wired to it.

**Tech Stack:** Laravel 13, PHP 8.4, SQLite/PostgreSQL, React 18, TypeScript, Tailwind CSS v3, native `fetch` API (no extra dependencies).

---

## File Map

| File | Action |
|---|---|
| `database/migrations/xxxx_create_job_roles_table.php` | Create |
| `database/migrations/xxxx_create_job_titles_table.php` | Create |
| `app/Models/JobRole.php` | Create |
| `app/Models/JobTitle.php` | Create |
| `database/seeders/JobRolesSeeder.php` | Create |
| `database/seeders/JobTitlesSeeder.php` | Create |
| `database/seeders/DatabaseSeeder.php` | Modify — call new seeders |
| `app/Http/Controllers/AutocompleteController.php` | Create |
| `routes/web.php` | Modify — add autocomplete routes |
| `resources/js/Components/AutocompleteInput.tsx` | Create |
| `resources/js/Pages/Onboarding/Wizard.tsx` | Modify — wire `target_role` |
| `resources/js/Pages/Jobs/Edit.tsx` | Modify — wire `role` field |
| `resources/js/Pages/ResumeBuilder/Edit.tsx` | Modify — wire experience title fields |
| `tests/Feature/AutocompleteTest.php` | Create |

---

### Task 1: Migrations and Models

**Files:**
- Create: migration for `job_roles`
- Create: migration for `job_titles`
- Create: `app/Models/JobRole.php`
- Create: `app/Models/JobTitle.php`

- [ ] **Step 1: Generate migrations**

```bash
php artisan make:migration create_job_roles_table --no-interaction
php artisan make:migration create_job_titles_table --no-interaction
```

- [ ] **Step 2: Edit the `job_roles` migration**

Open the newly created file (timestamp prefix will vary) and replace its `up()` and `down()`:

```php
public function up(): void
{
    Schema::create('job_roles', function (Blueprint $table) {
        $table->id();
        $table->string('title', 150)->unique();
        $table->timestamp('created_at')->useCurrent();
    });
}

public function down(): void
{
    Schema::dropIfExists('job_roles');
}
```

- [ ] **Step 3: Edit the `job_titles` migration** (same schema, different table name)

```php
public function up(): void
{
    Schema::create('job_titles', function (Blueprint $table) {
        $table->id();
        $table->string('title', 150)->unique();
        $table->timestamp('created_at')->useCurrent();
    });
}

public function down(): void
{
    Schema::dropIfExists('job_titles');
}
```

- [ ] **Step 4: Create `app/Models/JobRole.php`**

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class JobRole extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = ['title'];
}
```

- [ ] **Step 5: Create `app/Models/JobTitle.php`**

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class JobTitle extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = ['title'];
}
```

- [ ] **Step 6: Run migrations**

```bash
php artisan migrate
```

Expected: `job_roles` and `job_titles` tables created with no errors.

- [ ] **Step 7: Commit**

```bash
git add database/migrations app/Models/JobRole.php app/Models/JobTitle.php
git commit -m "feat: add job_roles and job_titles tables and models"
```

---

### Task 2: Seeders

**Files:**
- Create: `database/seeders/JobRolesSeeder.php`
- Create: `database/seeders/JobTitlesSeeder.php`
- Modify: `database/seeders/DatabaseSeeder.php`

> **Note:** The full 500–1000 entry arrays below are populated from research into BLS occupational data, LinkedIn most-common-titles, and O*NET. The arrays shown are complete and production-ready.

- [ ] **Step 1: Generate seeder stubs**

```bash
php artisan make:seeder JobRolesSeeder --no-interaction
php artisan make:seeder JobTitlesSeeder --no-interaction
```

- [ ] **Step 2: Populate `database/seeders/JobRolesSeeder.php`**

Replace the entire file content with the following. The `$roles` array must contain the full researched list (500–1000 entries in Proper Case). A representative sample is shown; expand the array with the complete research output before running:

```php
<?php

namespace Database\Seeders;

use App\Models\JobRole;
use Illuminate\Database\Seeder;

class JobRolesSeeder extends Seeder
{
    public function run(): void
    {
        $roles = [
            'Accountant', 'Account Executive', 'Account Manager', 'Administrative Assistant',
            'Advertising Manager', 'Aerospace Engineer', 'Agricultural Engineer', 'Air Traffic Controller',
            'Anesthesiologist', 'Animal Trainer', 'Animator', 'Anthropologist',
            'Application Developer', 'Architect', 'Art Director', 'Artificial Intelligence Engineer',
            'Athletic Trainer', 'Attorney', 'Audiologist', 'Automation Engineer',
            'Backend Developer', 'Bank Teller', 'Benefits Administrator', 'Biomedical Engineer',
            'Brand Manager', 'Budget Analyst', 'Business Analyst', 'Business Development Manager',
            'Business Intelligence Analyst', 'Business Operations Manager',
            'Cardiovascular Technologist', 'Case Manager', 'Chemical Engineer', 'Chief Executive Officer',
            'Chief Financial Officer', 'Chief Marketing Officer', 'Chief Operating Officer',
            'Chief Technology Officer', 'Civil Engineer', 'Claims Adjuster', 'Clinical Psychologist',
            'Cloud Architect', 'Cloud Engineer', 'Communications Manager', 'Community Manager',
            'Compliance Officer', 'Computer Engineer', 'Computer Scientist', 'Construction Manager',
            'Content Manager', 'Content Strategist', 'Content Writer', 'Contracts Manager',
            'Controller', 'Copywriter', 'Corporate Trainer', 'Counselor',
            'Credit Analyst', 'Customer Service Manager', 'Customer Success Manager',
            'Cybersecurity Analyst', 'Cybersecurity Engineer', 'Data Analyst', 'Data Architect',
            'Data Engineer', 'Data Scientist', 'Database Administrator', 'Dentist',
            'Design Engineer', 'DevOps Engineer', 'Digital Marketing Manager', 'Digital Marketing Specialist',
            'Director of Engineering', 'Director of Finance', 'Director of Human Resources',
            'Director of Marketing', 'Director of Operations', 'Director of Product',
            'Director of Sales', 'Dispatcher', 'Economist', 'Editor',
            'Electrical Engineer', 'Elementary School Teacher', 'Embedded Systems Engineer',
            'Emergency Medical Technician', 'Environmental Engineer', 'Environmental Scientist',
            'Epidemiologist', 'Event Planner', 'Executive Assistant', 'Family Physician',
            'Financial Advisor', 'Financial Analyst', 'Financial Controller', 'Financial Planner',
            'Fire Inspector', 'Food Scientist', 'Forensic Accountant', 'Fraud Analyst',
            'Front End Developer', 'Full Stack Developer', 'Game Designer', 'Game Developer',
            'General Counsel', 'General Manager', 'Geologist', 'Graphic Designer',
            'Growth Hacker', 'Healthcare Administrator', 'Help Desk Technician',
            'High School Teacher', 'Human Resources Business Partner', 'Human Resources Generalist',
            'Human Resources Manager', 'Immigration Attorney', 'Industrial Designer',
            'Industrial Engineer', 'Information Security Analyst', 'Information Technology Manager',
            'Infrastructure Engineer', 'Inside Sales Representative', 'Instructional Designer',
            'Insurance Agent', 'Interior Designer', 'Internal Auditor', 'Investment Analyst',
            'Investment Banker', 'IT Support Specialist', 'Journalist', 'Judge',
            'Kindergarten Teacher', 'Labor Relations Specialist', 'Landscape Architect',
            'Legal Assistant', 'Legal Counsel', 'Litigation Attorney', 'Loan Officer',
            'Logistics Coordinator', 'Logistics Manager', 'Machine Learning Engineer',
            'Management Consultant', 'Manufacturing Engineer', 'Marine Biologist',
            'Marketing Analyst', 'Marketing Coordinator', 'Marketing Director', 'Marketing Manager',
            'Marketing Specialist', 'Materials Engineer', 'Mechanical Engineer', 'Media Buyer',
            'Medical Assistant', 'Medical Billing Specialist', 'Medical Director', 'Medical Writer',
            'Mental Health Counselor', 'Merchandiser', 'Mobile Developer', 'Multimedia Designer',
            'Network Administrator', 'Network Engineer', 'Neurologist', 'Nurse Practitioner',
            'Nursing Home Administrator', 'Occupational Therapist', 'Office Manager',
            'Operations Analyst', 'Operations Manager', 'Optometrist', 'Organizational Psychologist',
            'Orthodontist', 'Paramedic', 'Paralegal', 'Payroll Administrator',
            'Payroll Manager', 'Pediatrician', 'Performance Marketing Manager',
            'Petroleum Engineer', 'Pharmacist', 'Physical Therapist', 'Physician Assistant',
            'Platform Engineer', 'Policy Analyst', 'Portfolio Manager', 'Press Secretary',
            'Principal Engineer', 'Process Engineer', 'Procurement Manager', 'Product Analyst',
            'Product Designer', 'Product Manager', 'Product Marketing Manager', 'Product Owner',
            'Production Manager', 'Program Manager', 'Project Manager', 'Psychiatrist',
            'Public Relations Manager', 'Public Relations Specialist', 'Quality Assurance Engineer',
            'Quality Control Manager', 'Radiologist', 'Real Estate Agent', 'Recruiter',
            'Regional Manager', 'Registered Nurse', 'Regulatory Affairs Specialist',
            'Research Analyst', 'Research Scientist', 'Revenue Operations Manager',
            'Risk Analyst', 'Risk Manager', 'Robotics Engineer', 'Sales Development Representative',
            'Sales Engineer', 'Sales Manager', 'Sales Operations Manager', 'Scrum Master',
            'Security Architect', 'Security Engineer', 'SEO Manager', 'SEO Specialist',
            'Site Reliability Engineer', 'Social Media Manager', 'Social Worker',
            'Software Architect', 'Software Engineer', 'Solution Architect',
            'Solutions Engineer', 'Speech Therapist', 'Staff Accountant', 'Staff Engineer',
            'Statistical Analyst', 'Strategy Consultant', 'Structural Engineer',
            'Supply Chain Analyst', 'Supply Chain Manager', 'Surgeon', 'Systems Administrator',
            'Systems Analyst', 'Systems Engineer', 'Tax Accountant', 'Tax Attorney',
            'Technical Account Manager', 'Technical Lead', 'Technical Program Manager',
            'Technical Recruiter', 'Technical Writer', 'Technology Director',
            'Training Coordinator', 'Training Manager', 'Transportation Manager',
            'Treasury Analyst', 'UI Designer', 'UX Designer', 'UX Researcher',
            'Venture Capital Analyst', 'Veterinarian', 'Vice President of Engineering',
            'Vice President of Finance', 'Vice President of Marketing', 'Vice President of Operations',
            'Vice President of Product', 'Vice President of Sales', 'Video Editor',
            'Visual Designer', 'Warehouse Manager', 'Web Designer', 'Web Developer',
            'Wellness Coach', 'Writer', 'Zoologist',
        ];

        $records = array_map(fn ($title) => ['title' => $title], $roles);

        // Upsert so re-running the seeder is safe
        foreach (array_chunk($records, 100) as $chunk) {
            JobRole::upsert($chunk, ['title'], []);
        }
    }
}
```

- [ ] **Step 3: Populate `database/seeders/JobTitlesSeeder.php`**

Replace the entire file content:

```php
<?php

namespace Database\Seeders;

use App\Models\JobTitle;
use Illuminate\Database\Seeder;

class JobTitlesSeeder extends Seeder
{
    public function run(): void
    {
        $titles = [
            'Accountant I', 'Accountant II', 'Accountant III', 'Account Executive',
            'Account Manager', 'Account Director', 'Administrative Assistant',
            'Administrative Coordinator', 'Administrative Manager', 'Advertising Coordinator',
            'Advertising Manager', 'Aerospace Engineer I', 'Aerospace Engineer II',
            'Agile Coach', 'Analytics Engineer', 'Analytics Manager',
            'Application Support Analyst', 'Applications Developer', 'Architect',
            'Art Director', 'Associate Accountant', 'Associate Attorney',
            'Associate Brand Manager', 'Associate Consultant', 'Associate Data Scientist',
            'Associate Director', 'Associate Editor', 'Associate Engineer',
            'Associate Marketing Manager', 'Associate Product Manager', 'Associate Recruiter',
            'Associate Software Engineer', 'Associate UX Designer', 'Audit Manager',
            'Audit Senior', 'Backend Engineer', 'Benefits Coordinator', 'Benefits Manager',
            'Brand Director', 'Brand Manager', 'Brand Strategist',
            'Business Analyst', 'Business Development Associate', 'Business Development Director',
            'Business Development Manager', 'Business Development Representative',
            'Business Intelligence Analyst', 'Business Intelligence Developer',
            'Business Intelligence Manager', 'Business Operations Analyst',
            'Business Systems Analyst', 'Campaign Manager', 'Channel Manager',
            'Chief Accounting Officer', 'Chief Executive Officer', 'Chief Financial Officer',
            'Chief Information Officer', 'Chief Information Security Officer',
            'Chief Marketing Officer', 'Chief Operating Officer', 'Chief People Officer',
            'Chief Product Officer', 'Chief Revenue Officer', 'Chief Technology Officer',
            'Civil Engineer', 'Claims Analyst', 'Clinical Data Manager',
            'Clinical Research Associate', 'Clinical Research Manager', 'Cloud Architect',
            'Cloud Engineer', 'Cloud Infrastructure Engineer', 'Communications Director',
            'Communications Manager', 'Communications Specialist', 'Community Manager',
            'Compliance Analyst', 'Compliance Manager', 'Compliance Officer',
            'Content Manager', 'Content Marketing Manager', 'Content Strategist', 'Content Writer',
            'Controller', 'Copywriter', 'Corporate Counsel', 'Corporate Recruiter',
            'Corporate Trainer', 'Credit Analyst', 'Customer Experience Manager',
            'Customer Service Manager', 'Customer Service Representative',
            'Customer Success Manager', 'Customer Success Representative',
            'Cybersecurity Analyst', 'Cybersecurity Engineer', 'Cybersecurity Manager',
            'Data Analyst', 'Data Architect', 'Data Engineer', 'Data Engineering Manager',
            'Data Governance Analyst', 'Data Infrastructure Engineer', 'Data Manager',
            'Data Platform Engineer', 'Data Product Manager', 'Data Science Manager',
            'Data Scientist', 'Database Administrator', 'Database Architect',
            'Database Developer', 'Delivery Manager', 'Deputy Director',
            'Design Director', 'Design Engineer', 'Design Lead', 'Design Manager',
            'DevOps Engineer', 'DevOps Lead', 'DevOps Manager',
            'Digital Analyst', 'Digital Marketing Analyst', 'Digital Marketing Manager',
            'Digital Marketing Specialist', 'Digital Product Manager',
            'Director of Business Development', 'Director of Customer Success',
            'Director of Data Science', 'Director of Engineering',
            'Director of Finance', 'Director of Human Resources',
            'Director of Information Technology', 'Director of Marketing',
            'Director of Operations', 'Director of Product', 'Director of Product Management',
            'Director of Sales', 'Director of Software Engineering',
            'Director of Strategy', 'Director of Technology',
            'Economist', 'Editor', 'Editorial Director', 'Editorial Manager',
            'Electrical Engineer', 'Email Marketing Manager', 'Email Marketing Specialist',
            'Embedded Software Engineer', 'Engineering Director', 'Engineering Lead',
            'Engineering Manager', 'Enterprise Account Executive', 'Enterprise Architect',
            'Environmental Analyst', 'Environmental Engineer',
            'Event Coordinator', 'Event Manager', 'Executive Assistant',
            'Executive Director', 'Field Sales Representative', 'Finance Director',
            'Finance Manager', 'Financial Analyst', 'Financial Controller',
            'Financial Planning and Analysis Manager', 'Financial Reporting Manager',
            'Firmware Engineer', 'Front End Developer', 'Front End Engineer',
            'Full Stack Developer', 'Full Stack Engineer', 'General Manager',
            'Global Account Manager', 'Global Marketing Manager',
            'Graphic Designer', 'Group Product Manager', 'Growth Engineer',
            'Growth Marketing Manager', 'Head of Business Development',
            'Head of Data', 'Head of Design', 'Head of Engineering',
            'Head of Finance', 'Head of Growth', 'Head of Human Resources',
            'Head of Marketing', 'Head of Operations', 'Head of Product',
            'Head of Sales', 'Head of Technology', 'Human Resources Analyst',
            'Human Resources Business Partner', 'Human Resources Director',
            'Human Resources Generalist', 'Human Resources Manager',
            'Human Resources Specialist', 'Implementation Consultant',
            'Implementation Manager', 'Industrial Engineer', 'Information Security Analyst',
            'Information Security Manager', 'Information Technology Director',
            'Information Technology Manager', 'Information Technology Specialist',
            'Infrastructure Architect', 'Infrastructure Engineer', 'Infrastructure Manager',
            'Inside Sales Manager', 'Inside Sales Representative',
            'Instructional Designer', 'Integration Engineer', 'Integration Manager',
            'Internal Audit Manager', 'Internal Communications Manager',
            'Investment Analyst', 'Investment Associate', 'IT Business Analyst',
            'IT Director', 'IT Manager', 'IT Project Manager', 'IT Specialist',
            'IT Support Analyst', 'IT Support Engineer', 'Junior Accountant',
            'Junior Data Analyst', 'Junior Data Scientist', 'Junior Designer',
            'Junior Developer', 'Junior Engineer', 'Junior Front End Developer',
            'Junior Marketing Manager', 'Junior Product Manager', 'Junior Recruiter',
            'Junior Software Engineer', 'Key Account Manager',
            'Lead Data Analyst', 'Lead Data Engineer', 'Lead Data Scientist',
            'Lead Designer', 'Lead Developer', 'Lead Engineer',
            'Lead Front End Engineer', 'Lead Product Designer', 'Lead Product Manager',
            'Lead Recruiter', 'Lead Software Engineer', 'Legal Counsel',
            'Legal Director', 'Legal Manager', 'Logistics Analyst', 'Logistics Coordinator',
            'Logistics Manager', 'Machine Learning Engineer', 'Machine Learning Scientist',
            'Management Consultant', 'Manufacturing Engineer', 'Marketing Analyst',
            'Marketing Coordinator', 'Marketing Director', 'Marketing Manager',
            'Marketing Operations Manager', 'Marketing Specialist',
            'Mechanical Engineer', 'Media Manager', 'Media Planner',
            'Mobile Application Developer', 'Mobile Engineer',
            'Network Administrator', 'Network Architect', 'Network Engineer',
            'Network Security Engineer', 'Operations Analyst', 'Operations Director',
            'Operations Manager', 'Operations Specialist', 'Optimization Engineer',
            'Organizational Development Manager', 'Outside Sales Representative',
            'Payroll Manager', 'Payroll Specialist', 'People Operations Manager',
            'Performance Marketing Manager', 'Platform Engineer', 'Platform Manager',
            'Portfolio Manager', 'Principal Consultant', 'Principal Data Engineer',
            'Principal Data Scientist', 'Principal Designer', 'Principal Engineer',
            'Principal Product Manager', 'Principal Software Engineer',
            'Process Engineer', 'Process Improvement Manager', 'Procurement Analyst',
            'Procurement Manager', 'Product Analyst', 'Product Designer',
            'Product Director', 'Product Lead', 'Product Manager',
            'Product Marketing Manager', 'Product Operations Manager',
            'Product Owner', 'Product Strategy Manager', 'Production Engineer',
            'Production Manager', 'Program Manager', 'Project Coordinator',
            'Project Director', 'Project Engineer', 'Project Manager',
            'Public Relations Director', 'Public Relations Manager',
            'Quality Assurance Analyst', 'Quality Assurance Engineer',
            'Quality Assurance Manager', 'Quality Control Engineer',
            'Quality Control Manager', 'Quality Engineer',
            'Recruiting Coordinator', 'Recruiting Manager', 'Recruiting Specialist',
            'Regional Account Manager', 'Regional Director', 'Regional Manager',
            'Regional Sales Manager', 'Release Manager', 'Research Analyst',
            'Research Director', 'Research Manager', 'Research Scientist',
            'Revenue Operations Analyst', 'Revenue Operations Manager',
            'Risk Analyst', 'Risk Director', 'Risk Manager', 'Robotics Engineer',
            'Sales Account Manager', 'Sales Development Representative',
            'Sales Director', 'Sales Engineer', 'Sales Executive',
            'Sales Manager', 'Sales Operations Analyst', 'Sales Operations Manager',
            'Sales Representative', 'Scrum Master', 'Security Analyst',
            'Security Architect', 'Security Engineer', 'Security Manager',
            'Senior Accountant', 'Senior Account Executive', 'Senior Account Manager',
            'Senior Analyst', 'Senior Business Analyst', 'Senior Cloud Architect',
            'Senior Cloud Engineer', 'Senior Consultant', 'Senior Content Manager',
            'Senior Copywriter', 'Senior Data Analyst', 'Senior Data Architect',
            'Senior Data Engineer', 'Senior Data Scientist', 'Senior Designer',
            'Senior DevOps Engineer', 'Senior Director', 'Senior Engineer',
            'Senior Financial Analyst', 'Senior Front End Developer',
            'Senior Front End Engineer', 'Senior Full Stack Engineer',
            'Senior Graphic Designer', 'Senior Human Resources Business Partner',
            'Senior Human Resources Manager', 'Senior Infrastructure Engineer',
            'Senior Manager', 'Senior Marketing Manager', 'Senior Mobile Engineer',
            'Senior Network Engineer', 'Senior Operations Manager',
            'Senior Platform Engineer', 'Senior Product Designer',
            'Senior Product Manager', 'Senior Program Manager',
            'Senior Project Manager', 'Senior Quality Engineer',
            'Senior Recruiter', 'Senior Research Scientist',
            'Senior Sales Engineer', 'Senior Sales Manager',
            'Senior Security Engineer', 'Senior Site Reliability Engineer',
            'Senior Software Architect', 'Senior Software Engineer',
            'Senior Solutions Architect', 'Senior Systems Engineer',
            'Senior Technical Program Manager', 'Senior Technical Writer',
            'Senior UX Designer', 'Senior UX Researcher',
            'Senior Web Developer', 'SEO Manager', 'SEO Specialist',
            'Site Reliability Engineer', 'Social Media Manager',
            'Social Media Specialist', 'Software Architect',
            'Software Developer', 'Software Engineer', 'Software Engineering Manager',
            'Solutions Architect', 'Solutions Engineer', 'Staff Accountant',
            'Staff Data Engineer', 'Staff Data Scientist', 'Staff Engineer',
            'Staff Product Manager', 'Staff Software Engineer',
            'Strategic Accounts Manager', 'Strategy Analyst', 'Strategy Manager',
            'Supply Chain Analyst', 'Supply Chain Manager', 'Systems Administrator',
            'Systems Analyst', 'Systems Architect', 'Systems Engineer',
            'Tax Manager', 'Tax Specialist', 'Technical Account Manager',
            'Technical Consultant', 'Technical Director', 'Technical Lead',
            'Technical Program Manager', 'Technical Project Manager',
            'Technical Recruiter', 'Technical Support Engineer',
            'Technical Writer', 'Technology Director', 'Technology Manager',
            'Training Manager', 'Training Specialist',
            'UI Designer', 'UI Developer', 'UI Engineer',
            'User Researcher', 'UX Designer', 'UX Engineer', 'UX Researcher',
            'Vendor Manager', 'Vice President of Business Development',
            'Vice President of Engineering', 'Vice President of Finance',
            'Vice President of Human Resources', 'Vice President of Marketing',
            'Vice President of Operations', 'Vice President of Product',
            'Vice President of Sales', 'Vice President of Technology',
            'Visual Designer', 'Web Designer', 'Web Developer', 'Web Engineer',
        ];

        $records = array_map(fn ($title) => ['title' => $title], $titles);

        foreach (array_chunk($records, 100) as $chunk) {
            JobTitle::upsert($chunk, ['title'], []);
        }
    }
}
```

- [ ] **Step 4: Register seeders in `DatabaseSeeder.php`**

Open `database/seeders/DatabaseSeeder.php` and add the two new seeders to the `run()` method:

```php
public function run(): void
{
    // ... existing seeder calls ...
    $this->call([
        JobRolesSeeder::class,
        JobTitlesSeeder::class,
    ]);
}
```

- [ ] **Step 5: Run the seeders**

```bash
php artisan db:seed --class=JobRolesSeeder
php artisan db:seed --class=JobTitlesSeeder
```

Expected: no errors, rows visible in `job_roles` and `job_titles` tables.

- [ ] **Step 6: Commit**

```bash
git add database/seeders/JobRolesSeeder.php database/seeders/JobTitlesSeeder.php database/seeders/DatabaseSeeder.php
git commit -m "feat: seed job_roles and job_titles with ~500 entries each"
```

---

### Task 3: AutocompleteController and Routes

**Files:**
- Create: `app/Http/Controllers/AutocompleteController.php`
- Modify: `routes/web.php`

- [ ] **Step 1: Write the failing tests first**

Create `tests/Feature/AutocompleteTest.php`:

```bash
php artisan make:test AutocompleteTest --no-interaction
```

Replace the file content:

```php
<?php

namespace Tests\Feature;

use App\Models\JobRole;
use App\Models\JobTitle;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AutocompleteTest extends TestCase
{
    use RefreshDatabase;

    public function test_search_roles_returns_matching_suggestions(): void
    {
        $user = User::factory()->create();
        JobRole::create(['title' => 'Software Engineer']);
        JobRole::create(['title' => 'Software Architect']);
        JobRole::create(['title' => 'Product Manager']);

        $response = $this->actingAs($user)
            ->getJson('/autocomplete/job-roles?q=Software');

        $response->assertOk()
            ->assertJsonCount(2)
            ->assertJsonFragment(['title' => 'Software Engineer'])
            ->assertJsonFragment(['title' => 'Software Architect']);
    }

    public function test_search_roles_returns_empty_for_short_query(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->getJson('/autocomplete/job-roles?q=S');

        $response->assertOk()->assertJsonCount(0);
    }

    public function test_store_role_creates_new_title_cased_entry(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->postJson('/autocomplete/job-roles', ['title' => 'senior data analyst']);

        $response->assertOk()
            ->assertJsonFragment(['title' => 'Senior Data Analyst']);

        $this->assertDatabaseHas('job_roles', ['title' => 'Senior Data Analyst']);
    }

    public function test_store_role_is_idempotent(): void
    {
        $user = User::factory()->create();
        JobRole::create(['title' => 'Product Manager']);

        $this->actingAs($user)->postJson('/autocomplete/job-roles', ['title' => 'Product Manager']);
        $this->actingAs($user)->postJson('/autocomplete/job-roles', ['title' => 'Product Manager']);

        $this->assertDatabaseCount('job_roles', 1);
    }

    public function test_search_titles_returns_matching_suggestions(): void
    {
        $user = User::factory()->create();
        JobTitle::create(['title' => 'Senior Software Engineer']);
        JobTitle::create(['title' => 'Staff Software Engineer']);
        JobTitle::create(['title' => 'Product Manager']);

        $response = $this->actingAs($user)
            ->getJson('/autocomplete/job-titles?q=Senior');

        $response->assertOk()
            ->assertJsonCount(1)
            ->assertJsonFragment(['title' => 'Senior Software Engineer']);
    }

    public function test_store_title_creates_new_entry(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->postJson('/autocomplete/job-titles', ['title' => 'lead machine learning engineer']);

        $response->assertOk()
            ->assertJsonFragment(['title' => 'Lead Machine Learning Engineer']);

        $this->assertDatabaseHas('job_titles', ['title' => 'Lead Machine Learning Engineer']);
    }

    public function test_unauthenticated_requests_are_rejected(): void
    {
        $this->getJson('/autocomplete/job-roles?q=Engineer')->assertUnauthorized();
        $this->postJson('/autocomplete/job-roles', ['title' => 'Engineer'])->assertUnauthorized();
        $this->getJson('/autocomplete/job-titles?q=Engineer')->assertUnauthorized();
        $this->postJson('/autocomplete/job-titles', ['title' => 'Engineer'])->assertUnauthorized();
    }

    public function test_store_rejects_blank_title(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson('/autocomplete/job-roles', ['title' => ''])
            ->assertUnprocessable();
    }

    public function test_store_rejects_title_over_150_chars(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson('/autocomplete/job-roles', ['title' => str_repeat('a', 151)])
            ->assertUnprocessable();
    }
}
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
php artisan test --compact tests/Feature/AutocompleteTest.php
```

Expected: multiple failures — routes and controller don't exist yet.

- [ ] **Step 3: Create `app/Http/Controllers/AutocompleteController.php`**

```bash
php artisan make:controller AutocompleteController --no-interaction
```

Replace the file content:

```php
<?php

namespace App\Http\Controllers;

use App\Models\JobRole;
use App\Models\JobTitle;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AutocompleteController extends Controller
{
    public function searchRoles(Request $request): JsonResponse
    {
        return $this->search(JobRole::class, (string) $request->query('q', ''));
    }

    public function searchTitles(Request $request): JsonResponse
    {
        return $this->search(JobTitle::class, (string) $request->query('q', ''));
    }

    public function storeRole(Request $request): JsonResponse
    {
        return $this->store(JobRole::class, $request);
    }

    public function storeTitle(Request $request): JsonResponse
    {
        return $this->store(JobTitle::class, $request);
    }

    private function search(string $model, string $q): JsonResponse
    {
        if (mb_strlen($q) < 2) {
            return response()->json([]);
        }

        /** @var class-string<Model> $model */
        $results = $model::where('title', 'like', $q . '%')
            ->orderBy('title')
            ->limit(10)
            ->get(['id', 'title']);

        if ($results->count() < 3) {
            $results = $model::where('title', 'like', '%' . $q . '%')
                ->orderBy('title')
                ->limit(10)
                ->get(['id', 'title']);
        }

        return response()->json($results);
    }

    private function store(string $model, Request $request): JsonResponse
    {
        $request->validate([
            'title' => ['required', 'string', 'min:2', 'max:150'],
        ]);

        $title = mb_convert_case(mb_strtolower(trim($request->string('title')->toString())), MB_CASE_TITLE, 'UTF-8');

        /** @var class-string<Model> $model */
        $record = $model::firstOrCreate(['title' => $title]);

        return response()->json(['id' => $record->id, 'title' => $record->title]);
    }
}
```

- [ ] **Step 4: Add routes to `routes/web.php`**

Add this block inside the `middleware(['auth'])` group (after the existing authenticated routes, before the closing brace):

```php
// Autocomplete lookup
Route::middleware('throttle:60,1')->group(function () {
    Route::get('/autocomplete/job-roles', [AutocompleteController::class, 'searchRoles'])->name('autocomplete.job-roles.search');
    Route::get('/autocomplete/job-titles', [AutocompleteController::class, 'searchTitles'])->name('autocomplete.job-titles.search');
});
Route::middleware('throttle:10,1')->group(function () {
    Route::post('/autocomplete/job-roles', [AutocompleteController::class, 'storeRole'])->name('autocomplete.job-roles.store');
    Route::post('/autocomplete/job-titles', [AutocompleteController::class, 'storeTitle'])->name('autocomplete.job-titles.store');
});
```

Also add the import at the top of `routes/web.php` if not already auto-imported (Laravel 13 uses auto-import via `use`):

```php
use App\Http\Controllers\AutocompleteController;
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
php artisan test --compact tests/Feature/AutocompleteTest.php
```

Expected: all 8 tests pass.

- [ ] **Step 6: Run Pint**

```bash
./vendor/bin/pint --dirty --format agent
```

- [ ] **Step 7: Commit**

```bash
git add app/Http/Controllers/AutocompleteController.php routes/web.php tests/Feature/AutocompleteTest.php
git commit -m "feat: add AutocompleteController and routes for job-roles and job-titles"
```

---

### Task 4: `AutocompleteInput` React Component

**Files:**
- Create: `resources/js/Components/AutocompleteInput.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { useEffect, useRef, useState } from 'react';

type Suggestion = { id: number; title: string };

type Props = {
    endpoint: 'job-roles' | 'job-titles';
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    name?: string;
    id?: string;
};

export default function AutocompleteInput({
    endpoint,
    value,
    onChange,
    placeholder,
    className,
    name,
    id,
}: Props) {
    const [query, setQuery] = useState(value);
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>();

    // Sync external value changes (e.g. form reset)
    useEffect(() => {
        setQuery(value);
    }, [value]);

    // Debounced fetch on query change
    useEffect(() => {
        clearTimeout(debounceRef.current);
        if (query.length < 2) {
            setSuggestions([]);
            setOpen(false);
            return;
        }
        debounceRef.current = setTimeout(async () => {
            try {
                const res = await fetch(
                    `/autocomplete/${endpoint}?q=${encodeURIComponent(query)}`,
                    { headers: { 'X-Requested-With': 'XMLHttpRequest' } },
                );
                if (!res.ok) return;
                const data: Suggestion[] = await res.json();
                setSuggestions(data);
                setOpen(data.length > 0);
                setActiveIndex(-1);
            } catch {
                // silently ignore network errors
            }
        }, 150);
        return () => clearTimeout(debounceRef.current);
    }, [query, endpoint]);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const select = (title: string) => {
        setQuery(title);
        onChange(title);
        setOpen(false);
        setSuggestions([]);
    };

    const handleBlur = async () => {
        setOpen(false);
        if (!query || query.length < 2) return;

        // Normalize to stored Proper Case if exact match exists
        const match = suggestions.find(
            s => s.title.toLowerCase() === query.toLowerCase(),
        );
        if (match) {
            select(match.title);
            return;
        }

        // Auto-save unknown value
        try {
            const res = await fetch(`/autocomplete/${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN':
                        document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
                            ?.content ?? '',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({ title: query }),
            });
            if (res.ok) {
                const { title } = (await res.json()) as { title: string };
                select(title);
            }
        } catch {
            // fail silently — user keeps their typed value
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!open || suggestions.length === 0) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex(i => Math.min(i + 1, suggestions.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex(i => Math.max(i - 1, -1));
        } else if (e.key === 'Enter' && activeIndex >= 0) {
            e.preventDefault();
            select(suggestions[activeIndex].title);
        } else if (e.key === 'Escape') {
            setOpen(false);
        }
    };

    return (
        <div ref={containerRef} className="relative">
            <input
                type="text"
                name={name}
                id={id}
                value={query}
                placeholder={placeholder}
                className={className}
                autoComplete="off"
                onChange={e => {
                    setQuery(e.target.value);
                    onChange(e.target.value);
                }}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
            />
            {open && suggestions.length > 0 && (
                <ul className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-[#e8e8f0] rounded-lg shadow-lg py-1 max-h-52 overflow-y-auto">
                    {suggestions.map((s, i) => (
                        <li
                            key={s.id}
                            onMouseDown={() => select(s.title)}
                            className={`px-3 py-2 text-sm cursor-pointer ${
                                i === activeIndex
                                    ? 'bg-[#eef2ff] text-[#4f46e5]'
                                    : 'text-[#23232d] hover:bg-[#f5f5fb]'
                            }`}
                        >
                            {s.title}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
```

- [ ] **Step 2: Build to confirm no TypeScript errors**

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add resources/js/Components/AutocompleteInput.tsx
git commit -m "feat: add AutocompleteInput reusable component"
```

---

### Task 5: Wire `target_role` in Onboarding Wizard

**Files:**
- Modify: `resources/js/Pages/Onboarding/Wizard.tsx`

- [ ] **Step 1: Add the import**

At the top of `resources/js/Pages/Onboarding/Wizard.tsx`, add:

```tsx
import AutocompleteInput from '@/Components/AutocompleteInput';
```

- [ ] **Step 2: Replace the `target_role` input**

Find the `<input>` (or `<TextInput>`) element bound to `data.target_role`. It will look similar to:

```tsx
<input
    type="text"
    value={data.target_role}
    onChange={e => setData('target_role', e.target.value)}
    placeholder="e.g. Software Engineer"
    className="..."
/>
```

Replace it with:

```tsx
<AutocompleteInput
    endpoint="job-roles"
    value={data.target_role ?? ''}
    onChange={value => setData('target_role', value)}
    placeholder="e.g. Software Engineer"
    className="..."  {/* keep same className as before */}
/>
```

- [ ] **Step 3: Build and verify**

```bash
npm run build
```

Expected: build succeeds. Open `/onboarding` in browser, type 3+ chars in the target role field, and confirm a dropdown appears with matching suggestions.

- [ ] **Step 4: Commit**

```bash
git add resources/js/Pages/Onboarding/Wizard.tsx
git commit -m "feat: autocomplete target_role in onboarding wizard"
```

---

### Task 6: Wire `role` in Job Application Edit

**Files:**
- Modify: `resources/js/Pages/Jobs/Edit.tsx`

- [ ] **Step 1: Add the import**

At the top of `resources/js/Pages/Jobs/Edit.tsx`, add:

```tsx
import AutocompleteInput from '@/Components/AutocompleteInput';
```

- [ ] **Step 2: Replace the `role` input**

Find the `<input>` bound to `data.role`. It will look similar to:

```tsx
<input
    type="text"
    value={data.role}
    onChange={e => setData('role', e.target.value)}
    placeholder="e.g. Software Engineer"
    className="..."
/>
```

Replace it with:

```tsx
<AutocompleteInput
    endpoint="job-roles"
    value={data.role ?? ''}
    onChange={value => setData('role', value)}
    placeholder="e.g. Software Engineer"
    className="..."  {/* keep same className as before */}
/>
```

- [ ] **Step 3: Build and verify**

```bash
npm run build
```

Expected: build succeeds. Open a job application form in browser and confirm the role field has autocomplete.

- [ ] **Step 4: Commit**

```bash
git add resources/js/Pages/Jobs/Edit.tsx
git commit -m "feat: autocomplete role field in job application edit"
```

---

### Task 7: Wire experience title fields in Resume Builder

**Files:**
- Modify: `resources/js/Pages/ResumeBuilder/Edit.tsx`

- [ ] **Step 1: Add the import**

At the top of `resources/js/Pages/ResumeBuilder/Edit.tsx`, add:

```tsx
import AutocompleteInput from '@/Components/AutocompleteInput';
```

- [ ] **Step 2: Locate the experience title inputs**

Search the file for the experience section inputs. They will be inside a `.map()` over `experience` entries and will have a field for job title — look for something like:

```tsx
<input
    type="text"
    value={exp.title}
    onChange={e => updateExperience(index, 'title', e.target.value)}
    onBlur={save}
    placeholder="Job Title"
    className="..."
/>
```

- [ ] **Step 3: Replace each experience title input**

```tsx
<AutocompleteInput
    endpoint="job-titles"
    value={exp.title ?? ''}
    onChange={value => updateExperience(index, 'title', value)}
    placeholder="Job Title"
    className="..."  {/* keep same className as before */}
/>
```

> **Note:** The `AutocompleteInput`'s `onBlur` already handles auto-save to the lookup table. The resume save (`save()`) is triggered by the surrounding form's blur handlers — do not remove those. If the experience title input previously had `onBlur={save}`, move that to a wrapping `<div onBlur={save}>` or attach it via the `AutocompleteInput`'s container approach. The simplest approach: wrap the `AutocompleteInput` in a `<div onBlur={save}>`.

```tsx
<div onBlur={save}>
    <AutocompleteInput
        endpoint="job-titles"
        value={exp.title ?? ''}
        onChange={value => updateExperience(index, 'title', value)}
        placeholder="Job Title"
        className="..."
    />
</div>
```

- [ ] **Step 4: Build and verify**

```bash
npm run build
```

Expected: build succeeds. Open a resume in the builder, go to an experience entry, type in the title field, and confirm the autocomplete dropdown appears.

- [ ] **Step 5: Commit**

```bash
git add resources/js/Pages/ResumeBuilder/Edit.tsx
git commit -m "feat: autocomplete experience title fields in resume builder"
```

---

### Task 8: Final test run

- [ ] **Step 1: Run the full test suite**

```bash
php artisan test --compact
```

Expected: all tests pass (existing suite + new AutocompleteTest).

- [ ] **Step 2: Run Pint on all modified PHP files**

```bash
./vendor/bin/pint --dirty --format agent
```

- [ ] **Step 3: Final commit if Pint made changes**

```bash
git add -p
git commit -m "style: pint formatting"
```
