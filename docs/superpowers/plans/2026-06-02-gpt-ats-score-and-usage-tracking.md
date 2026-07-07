# GPT ATS Score + AI Usage Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the local keyword-based ATS scorer with GPT-4o-mini (with DB caching), and add full AI usage tracking (tokens + cost) for all OpenAI and Anthropic calls, visible to admins and individual users.

**Architecture:** `AtsScorer` calls GPT-4o-mini and caches the result as JSON on the `resumes` table; on subsequent requests the controller returns the cached value without an API call. A new `AiUsageLogger` service records every API call (provider, model, feature, tokens, cost) to an `ai_usage_logs` table, with pricing read from a configurable `ai_model_rates` table. Two Inertia pages surface the data: `/admin/usage` (all users, admin-only) and `/usage` (own usage, any auth user).

**Tech Stack:** Laravel 13, PHP 8.4, `openai-php/client`, Inertia.js v2, React 18, TypeScript, Tailwind CSS v3, SQLite

**Important codebase note:** Admin access uses the existing `master_admin` middleware (`EnsureMasterAdmin` — checks `is_master_admin` on User) registered in `bootstrap/app.php`. Do NOT create a new email-based admin middleware. Use `['auth', 'master_admin']` for the admin usage route, consistent with all other admin routes.

---

## File Map

**Create:**
- `database/migrations/2026_06_02_100000_add_ats_cache_to_resumes_table.php`
- `database/migrations/2026_06_02_100001_create_ai_model_rates_table.php`
- `database/migrations/2026_06_02_100002_create_ai_usage_logs_table.php`
- `database/seeders/AiModelRatesSeeder.php`
- `app/Models/AiModelRate.php`
- `app/Models/AiUsageLog.php`
- `app/Services/AiUsageLogger.php`
- `app/Http/Controllers/UsageController.php`
- `app/Http/Controllers/Admin/AdminUsageController.php`
- `resources/js/Pages/Usage/Index.tsx`
- `resources/js/Pages/Admin/Usage.tsx`
- `tests/Feature/AiUsageLoggerTest.php`
- `tests/Feature/AdminUsageTest.php`
- `tests/Feature/UsageTest.php`

**Modify:**
- `app/Services/AtsScorer.php` — rewrite to use GPT-4o-mini with local fallback
- `app/Http/Controllers/AtsScoreController.php` — add cache check + `destroy` method
- `app/Http/Controllers/Api/AtsScoreController.php` — add cache check
- `app/Http/Controllers/AiSuggestController.php` — wire usage logging, use config model names
- `app/Http/Controllers/Api/AiSuggestController.php` — wire usage logging, use config model names
- `app/Models/Resume.php` — add `ats_cache`/`ats_cached_at` to `$fillable` and `$casts`
- `config/services.php` — add `openai.ats_model`, `openai.suggest_model`
- `routes/web.php` — add DELETE ats-score, GET /usage, GET /admin/usage
- `tests/Feature/AtsScoreTest.php` — add cache hit, cache miss, cache-bust tests

---

## Task 1: Migration — ATS cache columns on `resumes`

**Files:**
- Create: `database/migrations/2026_06_02_100000_add_ats_cache_to_resumes_table.php`
- Modify: `app/Models/Resume.php`

- [ ] **Step 1: Write the failing test**

Add to `tests/Feature/AtsScoreTest.php` inside the class (after existing tests):

```php
public function test_ats_cache_columns_exist(): void
{
    $user = User::factory()->create();
    $resume = $user->resumes()->create(['name' => 'r', 'pdf_filename' => 'r.pdf']);

    $resume->update(['ats_cache' => ['score' => 77], 'ats_cached_at' => now()]);

    $fresh = $resume->fresh();
    $this->assertEquals(77, $fresh->ats_cache['score']);
    $this->assertNotNull($fresh->ats_cached_at);
}
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
php artisan test --filter=test_ats_cache_columns_exist
```

Expected: FAIL — `Column not found: 1054 Unknown column 'ats_cache'`

- [ ] **Step 3: Create the migration**

```php
<?php
// database/migrations/2026_06_02_100000_add_ats_cache_to_resumes_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('resumes', function (Blueprint $table) {
            $table->json('ats_cache')->nullable()->after('certifications');
            $table->timestamp('ats_cached_at')->nullable()->after('ats_cache');
        });
    }

    public function down(): void
    {
        Schema::table('resumes', function (Blueprint $table) {
            $table->dropColumn(['ats_cache', 'ats_cached_at']);
        });
    }
};
```

- [ ] **Step 4: Update `Resume` model**

In `app/Models/Resume.php`, add to `$fillable` array:

```php
protected $fillable = [
    'user_id', 'name', 'pdf_filename', 'template',
    'accent_color', 'font_family',
    'contact', 'summary', 'experience', 'education',
    'skills', 'certifications', 'font_sizes',
    'ats_cache', 'ats_cached_at',
];
```

Add to `$casts` array:

```php
protected $casts = [
    'contact'       => 'array',
    'experience'    => 'array',
    'education'     => 'array',
    'skills'        => 'array',
    'certifications'=> 'array',
    'font_sizes'    => 'array',
    'ats_cache'     => 'array',
    'ats_cached_at' => 'datetime',
];
```

- [ ] **Step 5: Run the migration**

```bash
php artisan migrate
```

Expected: `Migrating: 2026_06_02_100000_add_ats_cache_to_resumes_table`

- [ ] **Step 6: Run the test to confirm it passes**

```bash
php artisan test --filter=test_ats_cache_columns_exist
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add database/migrations/2026_06_02_100000_add_ats_cache_to_resumes_table.php app/Models/Resume.php tests/Feature/AtsScoreTest.php
git commit -m "feat: add ats_cache columns to resumes table"
```

---

## Task 2: Migrations — `ai_model_rates` table + model + seeder

**Files:**
- Create: `database/migrations/2026_06_02_100001_create_ai_model_rates_table.php`
- Create: `app/Models/AiModelRate.php`
- Create: `database/seeders/AiModelRatesSeeder.php`

- [ ] **Step 1: Create the migration**

```php
<?php
// database/migrations/2026_06_02_100001_create_ai_model_rates_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_model_rates', function (Blueprint $table) {
            $table->id();
            $table->string('provider');          // 'openai' | 'anthropic'
            $table->string('model');
            $table->decimal('input_cost_per_million', 10, 6);
            $table->decimal('output_cost_per_million', 10, 6);
            $table->date('effective_from');
            $table->timestamps();

            $table->index(['provider', 'model', 'effective_from']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_model_rates');
    }
};
```

- [ ] **Step 2: Create `AiModelRate` model**

```php
<?php
// app/Models/AiModelRate.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AiModelRate extends Model
{
    protected $fillable = [
        'provider', 'model',
        'input_cost_per_million', 'output_cost_per_million',
        'effective_from',
    ];

    protected $casts = [
        'input_cost_per_million'  => 'float',
        'output_cost_per_million' => 'float',
        'effective_from'          => 'date',
    ];
}
```

- [ ] **Step 3: Create the seeder**

```php
<?php
// database/seeders/AiModelRatesSeeder.php

namespace Database\Seeders;

use App\Models\AiModelRate;
use Illuminate\Database\Seeder;

class AiModelRatesSeeder extends Seeder
{
    public function run(): void
    {
        $rates = [
            ['provider' => 'openai',    'model' => 'gpt-4o',            'input_cost_per_million' => 2.500000, 'output_cost_per_million' => 10.000000],
            ['provider' => 'openai',    'model' => 'gpt-4o-mini',       'input_cost_per_million' => 0.150000, 'output_cost_per_million' =>  0.600000],
            ['provider' => 'anthropic', 'model' => 'claude-sonnet-4-6', 'input_cost_per_million' => 3.000000, 'output_cost_per_million' => 15.000000],
            ['provider' => 'anthropic', 'model' => 'claude-haiku-4-5',  'input_cost_per_million' => 0.800000, 'output_cost_per_million' =>  4.000000],
        ];

        foreach ($rates as $rate) {
            AiModelRate::firstOrCreate(
                ['provider' => $rate['provider'], 'model' => $rate['model'], 'effective_from' => '2026-06-02'],
                $rate + ['effective_from' => '2026-06-02']
            );
        }
    }
}
```

- [ ] **Step 4: Register the seeder in `DatabaseSeeder`**

Open `database/seeders/DatabaseSeeder.php` and add inside `run()`:

```php
$this->call(AiModelRatesSeeder::class);
```

- [ ] **Step 5: Run migration and seed**

```bash
php artisan migrate && php artisan db:seed --class=AiModelRatesSeeder
```

Expected: migration runs, 4 rows inserted into `ai_model_rates`.

- [ ] **Step 6: Commit**

```bash
git add database/migrations/2026_06_02_100001_create_ai_model_rates_table.php app/Models/AiModelRate.php database/seeders/AiModelRatesSeeder.php database/seeders/DatabaseSeeder.php
git commit -m "feat: create ai_model_rates table, model, and seeder"
```

---

## Task 3: Migration — `ai_usage_logs` table + model

**Files:**
- Create: `database/migrations/2026_06_02_100002_create_ai_usage_logs_table.php`
- Create: `app/Models/AiUsageLog.php`

- [ ] **Step 1: Create the migration**

```php
<?php
// database/migrations/2026_06_02_100002_create_ai_usage_logs_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_usage_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('provider');   // 'openai' | 'anthropic'
            $table->string('model');
            $table->string('feature');    // 'ats_score' | 'ai_suggest'
            $table->unsignedInteger('input_tokens');
            $table->unsignedInteger('output_tokens');
            $table->decimal('cost_usd', 10, 6)->default(0);
            $table->timestamp('created_at')->useCurrent();

            $table->index(['user_id', 'created_at']);
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_usage_logs');
    }
};
```

- [ ] **Step 2: Create `AiUsageLog` model**

```php
<?php
// app/Models/AiUsageLog.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiUsageLog extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'user_id', 'provider', 'model', 'feature',
        'input_tokens', 'output_tokens', 'cost_usd',
    ];

    protected $casts = [
        'cost_usd'   => 'float',
        'created_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
```

- [ ] **Step 3: Run the migration**

```bash
php artisan migrate
```

Expected: `Migrating: 2026_06_02_100002_create_ai_usage_logs_table`

- [ ] **Step 4: Commit**

```bash
git add database/migrations/2026_06_02_100002_create_ai_usage_logs_table.php app/Models/AiUsageLog.php
git commit -m "feat: create ai_usage_logs table and model"
```

---

## Task 4: Config keys + `AiUsageLogger` service

**Files:**
- Modify: `config/services.php`
- Create: `app/Services/AiUsageLogger.php`
- Create: `tests/Feature/AiUsageLoggerTest.php`

- [ ] **Step 1: Write failing tests**

```php
<?php
// tests/Feature/AiUsageLoggerTest.php

namespace Tests\Feature;

use App\Models\AiModelRate;
use App\Models\AiUsageLog;
use App\Models\User;
use App\Services\AiUsageLogger;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AiUsageLoggerTest extends TestCase
{
    use RefreshDatabase;

    public function test_logs_usage_with_correct_cost(): void
    {
        AiModelRate::create([
            'provider' => 'openai', 'model' => 'gpt-4o-mini',
            'input_cost_per_million' => 0.15, 'output_cost_per_million' => 0.60,
            'effective_from' => '2026-01-01',
        ]);

        $user = User::factory()->create();

        AiUsageLogger::log(
            user: $user,
            provider: 'openai',
            model: 'gpt-4o-mini',
            feature: 'ats_score',
            inputTokens: 1_000_000,
            outputTokens: 1_000_000,
        );

        $log = AiUsageLog::first();
        $this->assertNotNull($log);
        $this->assertEquals($user->id, $log->user_id);
        $this->assertEquals('openai', $log->provider);
        $this->assertEquals('gpt-4o-mini', $log->model);
        $this->assertEquals('ats_score', $log->feature);
        $this->assertEquals(1_000_000, $log->input_tokens);
        $this->assertEquals(1_000_000, $log->output_tokens);
        $this->assertEqualsWithDelta(0.75, $log->cost_usd, 0.0001); // 0.15 + 0.60
    }

    public function test_logs_with_zero_cost_when_no_rate_found(): void
    {
        $user = User::factory()->create();

        AiUsageLogger::log(
            user: $user,
            provider: 'openai',
            model: 'unknown-model',
            feature: 'ai_suggest',
            inputTokens: 100,
            outputTokens: 50,
        );

        $log = AiUsageLog::first();
        $this->assertNotNull($log);
        $this->assertEqualsWithDelta(0.0, $log->cost_usd, 0.0001);
    }

    public function test_logs_with_null_user(): void
    {
        AiUsageLogger::log(
            user: null,
            provider: 'anthropic',
            model: 'claude-sonnet-4-6',
            feature: 'ai_suggest',
            inputTokens: 200,
            outputTokens: 100,
        );

        $this->assertEquals(1, AiUsageLog::count());
        $this->assertNull(AiUsageLog::first()->user_id);
    }

    public function test_never_throws_on_exception(): void
    {
        // Deliberately pass invalid data — logger must swallow it
        AiUsageLogger::log(
            user: null,
            provider: str_repeat('x', 300), // too long for column
            model: 'gpt-4o-mini',
            feature: 'ats_score',
            inputTokens: 0,
            outputTokens: 0,
        );

        // If we reach here without exception, the test passes
        $this->assertTrue(true);
    }

    public function test_uses_most_recent_rate_for_model(): void
    {
        AiModelRate::create([
            'provider' => 'openai', 'model' => 'gpt-4o',
            'input_cost_per_million' => 5.0, 'output_cost_per_million' => 15.0,
            'effective_from' => '2025-01-01',
        ]);
        AiModelRate::create([
            'provider' => 'openai', 'model' => 'gpt-4o',
            'input_cost_per_million' => 2.5, 'output_cost_per_million' => 10.0,
            'effective_from' => '2026-01-01',
        ]);

        AiUsageLogger::log(
            user: null, provider: 'openai', model: 'gpt-4o',
            feature: 'ai_suggest', inputTokens: 1_000_000, outputTokens: 1_000_000,
        );

        // Should use the 2026 rate (2.5 + 10.0 = 12.5)
        $this->assertEqualsWithDelta(12.5, AiUsageLog::first()->cost_usd, 0.0001);
    }
}
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
php artisan test --filter=AiUsageLoggerTest
```

Expected: FAIL — `Class App\Services\AiUsageLogger not found`

- [ ] **Step 3: Add config keys to `config/services.php`**

Replace the `openai` block:

```php
'openai' => [
    'key'          => env('OPENAI_API_KEY'),
    'ats_model'    => env('OPENAI_ATS_MODEL', 'gpt-4o-mini'),
    'suggest_model'=> env('OPENAI_SUGGEST_MODEL', 'gpt-4o'),
],
```

- [ ] **Step 4: Create `AiUsageLogger`**

```php
<?php
// app/Services/AiUsageLogger.php

namespace App\Services;

use App\Models\AiModelRate;
use App\Models\AiUsageLog;
use Illuminate\Contracts\Auth\Authenticatable;

class AiUsageLogger
{
    public static function log(
        ?Authenticatable $user,
        string $provider,
        string $model,
        string $feature,
        int $inputTokens,
        int $outputTokens,
    ): void {
        try {
            $rate = AiModelRate::where('provider', $provider)
                ->where('model', $model)
                ->where('effective_from', '<=', today())
                ->orderByDesc('effective_from')
                ->first();

            $costUsd = 0.0;
            if ($rate) {
                $costUsd = ($inputTokens / 1_000_000 * $rate->input_cost_per_million)
                         + ($outputTokens / 1_000_000 * $rate->output_cost_per_million);
            }

            AiUsageLog::create([
                'user_id'       => $user?->getAuthIdentifier(),
                'provider'      => $provider,
                'model'         => $model,
                'feature'       => $feature,
                'input_tokens'  => $inputTokens,
                'output_tokens' => $outputTokens,
                'cost_usd'      => $costUsd,
            ]);
        } catch (\Throwable) {
            // never break the caller
        }
    }
}
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
php artisan test --filter=AiUsageLoggerTest
```

Expected: 5 tests PASS

- [ ] **Step 6: Commit**

```bash
git add config/services.php app/Services/AiUsageLogger.php tests/Feature/AiUsageLoggerTest.php
git commit -m "feat: add AiUsageLogger service and config model keys"
```

---

## Task 5: Rewrite `AtsScorer` to use GPT-4o-mini

**Files:**
- Modify: `app/Services/AtsScorer.php`

- [ ] **Step 1: Rewrite `AtsScorer.php`**

Replace the entire file:

```php
<?php
// app/Services/AtsScorer.php

namespace App\Services;

use App\Data\AtsKeywords;
use App\Models\Resume;
use OpenAI;

class AtsScorer
{
    public static function score(Resume $resume): array
    {
        $apiKey = config('services.openai.key');
        $model  = config('services.openai.ats_model', 'gpt-4o-mini');

        if ($apiKey) {
            try {
                $result = self::scoreWithGpt($resume, $apiKey, $model);
                if ($result !== null) {
                    return $result;
                }
            } catch (\Throwable) {
                // fall through to local scorer
            }
        }

        return self::scoreLocally($resume);
    }

    private static function scoreWithGpt(Resume $resume, string $apiKey, string $model): ?array
    {
        $bullets  = implode("\n", self::collectBullets($resume));
        $skills   = implode(', ', self::collectSkills($resume));
        $summary  = $resume->summary ?? '';

        $prompt = <<<PROMPT
You are an ATS (Applicant Tracking System) scoring expert. Score this resume on four axes and return ONLY a valid JSON object — no markdown, no explanation.

Scoring axes (total 100 points):
- action_verbs (max 30 pts): Does the resume use strong action verbs (e.g. achieved, built, led, optimized, delivered, shipped)?
- technical (max 40 pts): Does the resume demonstrate technical skills relevant to the candidate's field?
- soft_skills (max 15 pts): Does the resume mention soft skills (e.g. leadership, communication, collaboration, mentorship)?
- format_signals (max 15 pts): Does the resume have: a summary ≥40 chars (3.75 pts), ≥3 bullet points (3.75 pts), dates in experience (3.75 pts), quantified achievements with numbers/percentages/dollar amounts (3.75 pts)?

For "found": list specific keywords/skills/verbs you detected.
For "missing": list 5–10 impactful keywords/skills that would strengthen this resume for ATS.

Return EXACTLY this JSON shape:
{
  "score": <integer 0-100>,
  "found": {
    "action_verbs": ["verb1", "verb2"],
    "technical": ["skill1", "skill2"],
    "soft_skills": ["skill1"]
  },
  "missing": {
    "action_verbs": ["verb1"],
    "technical": ["skill1"],
    "soft_skills": ["skill1"]
  },
  "breakdown": {
    "action_verbs": <integer 0-30>,
    "technical": <integer 0-40>,
    "soft_skills": <integer 0-15>,
    "format_signals": <integer 0-15>
  }
}

Resume content:
Summary: {$summary}
Skills: {$skills}
Experience bullets:
{$bullets}
PROMPT;

        $client   = OpenAI::client($apiKey);
        $response = $client->chat()->create([
            'model'           => $model,
            'max_tokens'      => 600,
            'response_format' => ['type' => 'json_object'],
            'messages'        => [['role' => 'user', 'content' => $prompt]],
        ]);

        AiUsageLogger::log(
            user: auth()->user(),
            provider: 'openai',
            model: $model,
            feature: 'ats_score',
            inputTokens: $response->usage->promptTokens,
            outputTokens: $response->usage->completionTokens,
        );

        $text   = $response->choices[0]->message->content ?? '';
        $parsed = json_decode($text, true);

        if (! is_array($parsed) || ! isset($parsed['score'], $parsed['found'], $parsed['missing'], $parsed['breakdown'])) {
            return null;
        }

        return $parsed;
    }

    // -------------------------------------------------------------------------
    // Local fallback scorer (used when OpenAI key is absent or call fails)
    // -------------------------------------------------------------------------

    public static function scoreLocally(Resume $resume): array
    {
        $summary  = (string) ($resume->summary ?? '');
        $bullets  = self::collectBullets($resume);
        $skills   = self::collectSkills($resume);

        $bulletText  = strtolower(implode("\n", $bullets));
        $summaryText = strtolower($summary);
        $skillsText  = strtolower(implode(',', $skills));

        $verbSource = $bulletText."\n".$summaryText;
        [$verbsFound, $verbsMissing] = self::matchKeywords(AtsKeywords::ACTION_VERBS, $verbSource);
        $verbScore = self::ratio(count($verbsFound), 12) * 30;

        $techSource = $skillsText."\n".$bulletText;
        [$techFound, $techMissing] = self::matchKeywords(AtsKeywords::TECHNICAL, $techSource);
        $techScore = self::ratio(count($techFound), 8) * 40;

        $softSource = $summaryText."\n".$bulletText;
        [$softFound, $softMissing] = self::matchKeywords(AtsKeywords::SOFT_SKILLS, $softSource);
        $softScore = self::ratio(count($softFound), 4) * 15;

        $hasSummary   = strlen(trim($summary)) >= 40 ? 1 : 0;
        $hasBullets   = count($bullets) >= 3 ? 1 : 0;
        $hasDates     = self::hasDates($resume) ? 1 : 0;
        $hasQuant     = preg_match(AtsKeywords::quantifiedAchievementRegex(), $bulletText.' '.$summaryText) === 1 ? 1 : 0;
        $formatScore  = (($hasSummary + $hasBullets + $hasDates + $hasQuant) / 4) * 15;

        $total = max(0, min(100, (int) round($verbScore + $techScore + $softScore + $formatScore)));

        return [
            'score'   => $total,
            'found'   => ['action_verbs' => $verbsFound,  'technical' => $techFound,  'soft_skills' => $softFound],
            'missing' => ['action_verbs' => array_slice($verbsMissing, 0, 10), 'technical' => array_slice($techMissing, 0, 10), 'soft_skills' => array_slice($softMissing, 0, 10)],
            'breakdown' => [
                'action_verbs'   => (int) round($verbScore),
                'technical'      => (int) round($techScore),
                'soft_skills'    => (int) round($softScore),
                'format_signals' => (int) round($formatScore),
            ],
        ];
    }

    private static function matchKeywords(array $keywords, string $haystack): array
    {
        $found   = [];
        $missing = [];
        foreach ($keywords as $kw) {
            $needle  = strtolower($kw);
            $pattern = '/(?<![a-z0-9])'.preg_quote($needle, '/').'(?![a-z0-9])/i';
            if (preg_match($pattern, $haystack) === 1) {
                $found[] = $kw;
            } else {
                $missing[] = $kw;
            }
        }

        return [$found, $missing];
    }

    private static function ratio(int $found, int $target): float
    {
        return $target <= 0 ? 0.0 : min(1.0, $found / $target);
    }

    private static function collectBullets(Resume $resume): array
    {
        $out = [];
        foreach (($resume->experience ?? []) as $entry) {
            if (! empty($entry['bullets'])) {
                $out[] = is_array($entry['bullets']) ? implode(' ', $entry['bullets']) : (string) $entry['bullets'];
            }
        }

        return $out;
    }

    private static function collectSkills(Resume $resume): array
    {
        return array_values(array_filter((array) ($resume->skills ?? []), fn ($s) => is_string($s) && trim($s) !== ''));
    }

    private static function hasDates(Resume $resume): bool
    {
        foreach (($resume->experience ?? []) as $entry) {
            if (! empty($entry['start_date'])) {
                return true;
            }
        }

        return false;
    }
}
```

- [ ] **Step 2: Run the existing ATS score tests (they use the fallback path since no API key in test env)**

```bash
php artisan test tests/Feature/AtsScoreTest.php
```

Expected: All existing tests PASS (fallback scorer is used — no OpenAI key in test env)

- [ ] **Step 3: Commit**

```bash
git add app/Services/AtsScorer.php
git commit -m "feat: rewrite AtsScorer to use GPT-4o-mini with local fallback"
```

---

## Task 6: Update `AtsScoreController` — cache logic + `destroy`

**Files:**
- Modify: `app/Http/Controllers/AtsScoreController.php`
- Modify: `app/Http/Controllers/Api/AtsScoreController.php`
- Modify: `routes/web.php`

- [ ] **Step 1: Write failing tests**

Add to `tests/Feature/AtsScoreTest.php`:

```php
public function test_score_is_cached_on_first_fetch(): void
{
    $user   = User::factory()->create();
    $resume = $user->resumes()->create(['name' => 'r', 'pdf_filename' => 'r.pdf']);

    $this->assertNull($resume->ats_cache);

    $this->actingAs($user)->getJson(route('builder.ats-score', $resume->id))->assertOk();

    $this->assertNotNull($resume->fresh()->ats_cache);
    $this->assertNotNull($resume->fresh()->ats_cached_at);
}

public function test_cached_score_is_returned_without_recomputing(): void
{
    $user   = User::factory()->create();
    $resume = $user->resumes()->create([
        'name'          => 'r',
        'pdf_filename'  => 'r.pdf',
        'ats_cache'     => ['score' => 99, 'found' => [], 'missing' => [], 'breakdown' => ['action_verbs' => 29, 'technical' => 40, 'soft_skills' => 15, 'format_signals' => 15]],
        'ats_cached_at' => now(),
    ]);

    $response = $this->actingAs($user)->getJson(route('builder.ats-score', $resume->id));

    $response->assertOk()->assertJsonPath('score', 99);
}

public function test_cache_bust_clears_ats_cache(): void
{
    $user   = User::factory()->create();
    $resume = $user->resumes()->create([
        'name'          => 'r',
        'pdf_filename'  => 'r.pdf',
        'ats_cache'     => ['score' => 88, 'found' => [], 'missing' => [], 'breakdown' => []],
        'ats_cached_at' => now(),
    ]);

    $this->actingAs($user)
        ->deleteJson(route('builder.ats-score.destroy', $resume->id))
        ->assertNoContent();

    $fresh = $resume->fresh();
    $this->assertNull($fresh->ats_cache);
    $this->assertNull($fresh->ats_cached_at);
}

public function test_cache_bust_requires_ownership(): void
{
    $owner = User::factory()->create();
    $other = User::factory()->create();
    $resume = $owner->resumes()->create(['name' => 'r', 'pdf_filename' => 'r.pdf']);

    $this->actingAs($other)
        ->deleteJson(route('builder.ats-score.destroy', $resume->id))
        ->assertForbidden();
}
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
php artisan test --filter="test_score_is_cached_on_first_fetch|test_cached_score_is_returned|test_cache_bust"
```

Expected: FAIL — route `builder.ats-score.destroy` not found

- [ ] **Step 3: Add the DELETE route to `routes/web.php`**

Find the existing ATS score route and replace with:

```php
Route::get('/builder/{resume}/ats-score', [AtsScoreController::class, 'show'])
    ->middleware('throttle:10,1')
    ->name('builder.ats-score');
Route::delete('/builder/{resume}/ats-score', [AtsScoreController::class, 'destroy'])
    ->name('builder.ats-score.destroy');
```

- [ ] **Step 4: Update `AtsScoreController`**

Replace `app/Http/Controllers/AtsScoreController.php` entirely:

```php
<?php
// app/Http/Controllers/AtsScoreController.php

namespace App\Http\Controllers;

use App\Models\Resume;
use App\Services\AtsScorer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

class AtsScoreController extends Controller
{
    public function show(Resume $resume): JsonResponse
    {
        $this->authorize('update', $resume);

        if ($resume->ats_cache !== null) {
            return response()->json($resume->ats_cache);
        }

        $result = AtsScorer::score($resume);

        $resume->update([
            'ats_cache'     => $result,
            'ats_cached_at' => now(),
        ]);

        return response()->json($result);
    }

    public function destroy(Resume $resume): Response
    {
        $this->authorize('update', $resume);

        $resume->update([
            'ats_cache'     => null,
            'ats_cached_at' => null,
        ]);

        return response()->noContent();
    }
}
```

- [ ] **Step 5: Update `Api/AtsScoreController` with cache-read logic**

Replace `app/Http/Controllers/Api/AtsScoreController.php` entirely:

```php
<?php
// app/Http/Controllers/Api/AtsScoreController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Resume;
use App\Services\AtsScorer;
use Illuminate\Http\JsonResponse;

class AtsScoreController extends Controller
{
    public function show(Resume $resume): JsonResponse
    {
        $this->authorize('update', $resume);

        if ($resume->ats_cache !== null) {
            return response()->json($resume->ats_cache);
        }

        $result = AtsScorer::score($resume);

        $resume->update([
            'ats_cache'     => $result,
            'ats_cached_at' => now(),
        ]);

        return response()->json($result);
    }
}
```

- [ ] **Step 6: Run all ATS score tests**

```bash
php artisan test tests/Feature/AtsScoreTest.php tests/Feature/Api/AtsScoreApiTest.php
```

Expected: All tests PASS

- [ ] **Step 7: Commit**

```bash
git add app/Http/Controllers/AtsScoreController.php app/Http/Controllers/Api/AtsScoreController.php routes/web.php tests/Feature/AtsScoreTest.php
git commit -m "feat: add ATS score DB cache and cache-bust endpoint"
```

---

## Task 7: Wire `AiUsageLogger` into `AiSuggestController` (web)

**Files:**
- Modify: `app/Http/Controllers/AiSuggestController.php`

- [ ] **Step 1: Update `suggestWithOpenAI` and `suggestWithClaude` in `app/Http/Controllers/AiSuggestController.php`**

Add the import at the top of the file (after the existing `use` statements):

```php
use App\Services\AiUsageLogger;
```

Replace `suggestWithOpenAI()`:

```php
private function suggestWithOpenAI(string $field, array $context): JsonResponse
{
    $apiKey = config('services.openai.key');
    if (! $apiKey) {
        return response()->json(['error' => 'API key not configured'], 422);
    }

    $model  = config('services.openai.suggest_model', 'gpt-4o');
    $client = OpenAI::client($apiKey);

    $result = $client->chat()->create([
        'model'      => $model,
        'max_tokens' => 400,
        'messages'   => [['role' => 'user', 'content' => $this->buildPrompt($field, $context)]],
    ]);

    AiUsageLogger::log(
        user: auth()->user(),
        provider: 'openai',
        model: $model,
        feature: 'ai_suggest',
        inputTokens: $result->usage->promptTokens,
        outputTokens: $result->usage->completionTokens,
    );

    $text        = $result->choices[0]->message->content ?? '[]';
    $suggestions = json_decode($text, true) ?? [];

    return response()->json(['suggestions' => array_slice($suggestions, 0, 3)]);
}
```

Replace `suggestWithClaude()`:

```php
private function suggestWithClaude(string $field, array $context): JsonResponse
{
    $apiKey = config('services.anthropic.key');
    if (! $apiKey) {
        return response()->json(['error' => 'API key not configured'], 422);
    }

    $model = config('services.anthropic.model', 'claude-sonnet-4-6');

    $response = Http::withHeaders([
        'x-api-key'         => $apiKey,
        'anthropic-version' => '2023-06-01',
        'content-type'      => 'application/json',
    ])->post('https://api.anthropic.com/v1/messages', [
        'model'      => $model,
        'max_tokens' => 400,
        'messages'   => [['role' => 'user', 'content' => $this->buildPrompt($field, $context)]],
    ]);

    if (! $response->ok()) {
        return response()->json(['error' => 'AI request failed'], 502);
    }

    AiUsageLogger::log(
        user: auth()->user(),
        provider: 'anthropic',
        model: $model,
        feature: 'ai_suggest',
        inputTokens: $response->json('usage.input_tokens', 0),
        outputTokens: $response->json('usage.output_tokens', 0),
    );

    $text        = $response->json('content.0.text', '[]');
    $suggestions = json_decode($text, true) ?? [];

    return response()->json(['suggestions' => array_slice($suggestions, 0, 3)]);
}
```

- [ ] **Step 2: Run the full test suite to confirm no regressions**

```bash
php artisan test
```

Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add app/Http/Controllers/AiSuggestController.php
git commit -m "feat: wire AiUsageLogger into web AiSuggestController"
```

---

## Task 8: Wire `AiUsageLogger` into `Api/AiSuggestController`

**Files:**
- Modify: `app/Http/Controllers/Api/AiSuggestController.php`

- [ ] **Step 1: Update `app/Http/Controllers/Api/AiSuggestController.php`**

Add the import after the existing `use` statements:

```php
use App\Services\AiUsageLogger;
```

Replace `suggestWithOpenAI()`:

```php
private function suggestWithOpenAI(string $field, array $context): JsonResponse
{
    $apiKey = config('services.openai.key');
    if (! $apiKey) {
        return response()->json(['error' => 'API key not configured'], 422);
    }

    $model  = config('services.openai.suggest_model', 'gpt-4o');
    $client = OpenAI::client($apiKey);

    $result = $client->chat()->create([
        'model'      => $model,
        'max_tokens' => 400,
        'messages'   => [['role' => 'user', 'content' => $this->buildPrompt($field, $context)]],
    ]);

    AiUsageLogger::log(
        user: auth()->user(),
        provider: 'openai',
        model: $model,
        feature: 'ai_suggest',
        inputTokens: $result->usage->promptTokens,
        outputTokens: $result->usage->completionTokens,
    );

    $text        = $result->choices[0]->message->content ?? '[]';
    $suggestions = json_decode($text, true) ?? [];

    return response()->json(['suggestions' => array_slice($suggestions, 0, 3)]);
}
```

Replace `suggestWithClaude()`:

```php
private function suggestWithClaude(string $field, array $context): JsonResponse
{
    $apiKey = config('services.anthropic.key');
    if (! $apiKey) {
        return response()->json(['error' => 'API key not configured'], 422);
    }

    $model = config('services.anthropic.model', 'claude-sonnet-4-6');

    $response = Http::withHeaders([
        'x-api-key'         => $apiKey,
        'anthropic-version' => '2023-06-01',
        'content-type'      => 'application/json',
    ])->post('https://api.anthropic.com/v1/messages', [
        'model'      => $model,
        'max_tokens' => 400,
        'messages'   => [['role' => 'user', 'content' => $this->buildPrompt($field, $context)]],
    ]);

    if (! $response->ok()) {
        return response()->json(['error' => 'AI request failed'], 502);
    }

    AiUsageLogger::log(
        user: auth()->user(),
        provider: 'anthropic',
        model: $model,
        feature: 'ai_suggest',
        inputTokens: $response->json('usage.input_tokens', 0),
        outputTokens: $response->json('usage.output_tokens', 0),
    );

    $text        = $response->json('content.0.text', '[]');
    $suggestions = json_decode($text, true) ?? [];

    return response()->json(['suggestions' => array_slice($suggestions, 0, 3)]);
}
```

- [ ] **Step 2: Run the full test suite**

```bash
php artisan test
```

Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add app/Http/Controllers/Api/AiSuggestController.php
git commit -m "feat: wire AiUsageLogger into API AiSuggestController"
```

---

## Task 9: Admin usage dashboard (controller + route + frontend)

**Files:**
- Create: `app/Http/Controllers/Admin/AdminUsageController.php`
- Create: `resources/js/Pages/Admin/Usage.tsx`
- Modify: `routes/web.php`
- Create: `tests/Feature/AdminUsageTest.php`

- [ ] **Step 1: Write failing tests**

```php
<?php
// tests/Feature/AdminUsageTest.php

namespace Tests\Feature;

use App\Models\AiUsageLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminUsageTest extends TestCase
{
    use RefreshDatabase;

    public function test_non_admin_cannot_access_admin_usage(): void
    {
        $user = User::factory()->create(['is_master_admin' => false]);

        $this->actingAs($user)
            ->get('/admin/usage')
            ->assertForbidden();
    }

    public function test_unauthenticated_cannot_access_admin_usage(): void
    {
        $this->get('/admin/usage')->assertRedirect('/login');
    }

    public function test_admin_can_access_usage_page(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);

        $this->actingAs($admin)
            ->get('/admin/usage')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Usage')
                ->has('totalCost')
                ->has('byProvider')
                ->has('byFeature')
                ->has('byModel')
                ->has('perUser')
                ->has('dateRange')
            );
    }

    public function test_admin_usage_aggregates_correctly(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);
        $user  = User::factory()->create();

        AiUsageLog::create([
            'user_id' => $user->id, 'provider' => 'openai', 'model' => 'gpt-4o-mini',
            'feature' => 'ats_score', 'input_tokens' => 500, 'output_tokens' => 200,
            'cost_usd' => 0.000195,
        ]);
        AiUsageLog::create([
            'user_id' => $user->id, 'provider' => 'anthropic', 'model' => 'claude-sonnet-4-6',
            'feature' => 'ai_suggest', 'input_tokens' => 300, 'output_tokens' => 150,
            'cost_usd' => 0.003150,
        ]);

        $response = $this->actingAs($admin)->get('/admin/usage?range=all');

        $response->assertOk();
        $this->assertEqualsWithDelta(0.003345, $response->json('props.totalCost'), 0.000001);
        $this->assertCount(2, $response->json('props.byProvider'));
    }
}
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
php artisan test --filter=AdminUsageTest
```

Expected: FAIL — route not found

- [ ] **Step 3: Create `AdminUsageController`**

```php
<?php
// app/Http/Controllers/Admin/AdminUsageController.php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AiUsageLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class AdminUsageController extends Controller
{
    public function index(Request $request): Response
    {
        $range = $request->query('range', '30days');

        $query = AiUsageLog::query();
        $query = match ($range) {
            'month'  => $query->whereMonth('created_at', now()->month)->whereYear('created_at', now()->year),
            'all'    => $query,
            default  => $query->where('created_at', '>=', now()->subDays(30)),
        };

        $totalCost = (clone $query)->sum('cost_usd');

        $byProvider = (clone $query)
            ->select('provider', DB::raw('COUNT(*) as calls'), DB::raw('SUM(cost_usd) as cost'))
            ->groupBy('provider')
            ->get()
            ->map(fn ($r) => ['provider' => $r->provider, 'calls' => $r->calls, 'cost' => (float) $r->cost])
            ->values();

        $byModel = (clone $query)
            ->select('provider', 'model', DB::raw('COUNT(*) as calls'), DB::raw('SUM(cost_usd) as cost'))
            ->groupBy('provider', 'model')
            ->get()
            ->map(fn ($r) => ['provider' => $r->provider, 'model' => $r->model, 'calls' => $r->calls, 'cost' => (float) $r->cost])
            ->values();

        $byFeature = (clone $query)
            ->select('feature', DB::raw('COUNT(*) as calls'), DB::raw('SUM(cost_usd) as cost'))
            ->groupBy('feature')
            ->get()
            ->map(fn ($r) => ['feature' => $r->feature, 'calls' => $r->calls, 'cost' => (float) $r->cost])
            ->values();

        $perUser = (clone $query)
            ->select('user_id', DB::raw('COUNT(*) as calls'), DB::raw('SUM(cost_usd) as cost'), DB::raw('MAX(created_at) as last_active'))
            ->groupBy('user_id')
            ->with('user:id,name,email')
            ->get()
            ->map(fn ($r) => [
                'user_id'     => $r->user_id,
                'name'        => $r->user?->name ?? '—',
                'email'       => $r->user?->email ?? '—',
                'calls'       => $r->calls,
                'cost'        => (float) $r->cost,
                'last_active' => $r->last_active,
            ])
            ->sortByDesc('cost')
            ->values();

        return Inertia::render('Admin/Usage', [
            'totalCost'  => (float) $totalCost,
            'byProvider' => $byProvider,
            'byModel'    => $byModel,
            'byFeature'  => $byFeature,
            'perUser'    => $perUser,
            'dateRange'  => $range,
        ]);
    }
}
```

- [ ] **Step 4: Add the route to `routes/web.php`**

Inside the existing `Route::middleware(['auth', 'master_admin'])->prefix('admin')->name('admin.')` group, add:

```php
use App\Http\Controllers\Admin\AdminUsageController;

// inside the group:
Route::get('/usage', [AdminUsageController::class, 'index'])->name('admin.usage');
```

The import goes at the top of `routes/web.php` with the other Admin imports.

- [ ] **Step 5: Create `resources/js/Pages/Admin/Usage.tsx`**

```tsx
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, usePage } from '@inertiajs/react';
import { PageProps } from '@/types';

type ProviderStat  = { provider: string; calls: number; cost: number };
type ModelStat     = { provider: string; model: string; calls: number; cost: number };
type FeatureStat   = { feature: string; calls: number; cost: number };
type UserStat      = { user_id: number | null; name: string; email: string; calls: number; cost: number; last_active: string };

type Props = PageProps<{
    totalCost: number;
    byProvider: ProviderStat[];
    byModel: ModelStat[];
    byFeature: FeatureStat[];
    perUser: UserStat[];
    dateRange: string;
}>;

const fmt = (n: number) => `$${n.toFixed(6)}`;
const fmtShort = (n: number) => `$${n.toFixed(4)}`;

export default function AdminUsage() {
    const { totalCost, byProvider, byModel, byFeature, perUser, dateRange } = usePage<Props>().props;

    const changeRange = (range: string) => {
        router.get('/admin/usage', { range }, { preserveState: false });
    };

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">AI Usage — Admin</h2>}
        >
            <Head title="Admin: AI Usage" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8 space-y-6">

                    {/* Date range filter */}
                    <div className="flex gap-2">
                        {(['30days', 'month', 'all'] as const).map((r) => (
                            <button
                                key={r}
                                onClick={() => changeRange(r)}
                                className={`px-3 py-1 rounded text-sm font-medium border ${dateRange === r ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                            >
                                {r === '30days' ? 'Last 30 days' : r === 'month' ? 'This month' : 'All time'}
                            </button>
                        ))}
                    </div>

                    {/* Total cost */}
                    <div className="bg-white shadow-sm sm:rounded-lg p-6">
                        <p className="text-sm text-gray-500">Total AI Cost</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">{fmtShort(totalCost)}</p>
                    </div>

                    {/* By provider + by feature */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white shadow-sm sm:rounded-lg overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100">
                                <h3 className="text-base font-semibold text-gray-900">By Provider</h3>
                            </div>
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        <th className="px-6 py-3 text-left">Provider</th>
                                        <th className="px-6 py-3 text-right">Calls</th>
                                        <th className="px-6 py-3 text-right">Cost</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {byProvider.map((r) => (
                                        <tr key={r.provider} className="hover:bg-gray-50">
                                            <td className="px-6 py-3 font-medium capitalize">{r.provider}</td>
                                            <td className="px-6 py-3 text-right tabular-nums">{r.calls}</td>
                                            <td className="px-6 py-3 text-right tabular-nums">{fmtShort(r.cost)}</td>
                                        </tr>
                                    ))}
                                    {byProvider.length === 0 && (
                                        <tr><td colSpan={3} className="px-6 py-6 text-center text-gray-400 text-xs">No data</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="bg-white shadow-sm sm:rounded-lg overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100">
                                <h3 className="text-base font-semibold text-gray-900">By Feature</h3>
                            </div>
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        <th className="px-6 py-3 text-left">Feature</th>
                                        <th className="px-6 py-3 text-right">Calls</th>
                                        <th className="px-6 py-3 text-right">Cost</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {byFeature.map((r) => (
                                        <tr key={r.feature} className="hover:bg-gray-50">
                                            <td className="px-6 py-3 font-medium">{r.feature}</td>
                                            <td className="px-6 py-3 text-right tabular-nums">{r.calls}</td>
                                            <td className="px-6 py-3 text-right tabular-nums">{fmtShort(r.cost)}</td>
                                        </tr>
                                    ))}
                                    {byFeature.length === 0 && (
                                        <tr><td colSpan={3} className="px-6 py-6 text-center text-gray-400 text-xs">No data</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* By model */}
                    <div className="bg-white shadow-sm sm:rounded-lg overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100">
                            <h3 className="text-base font-semibold text-gray-900">By Model</h3>
                        </div>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    <th className="px-6 py-3 text-left">Provider</th>
                                    <th className="px-6 py-3 text-left">Model</th>
                                    <th className="px-6 py-3 text-right">Calls</th>
                                    <th className="px-6 py-3 text-right">Cost</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {byModel.map((r) => (
                                    <tr key={`${r.provider}-${r.model}`} className="hover:bg-gray-50">
                                        <td className="px-6 py-3 capitalize text-gray-500">{r.provider}</td>
                                        <td className="px-6 py-3 font-medium font-mono text-xs">{r.model}</td>
                                        <td className="px-6 py-3 text-right tabular-nums">{r.calls}</td>
                                        <td className="px-6 py-3 text-right tabular-nums">{fmtShort(r.cost)}</td>
                                    </tr>
                                ))}
                                {byModel.length === 0 && (
                                    <tr><td colSpan={4} className="px-6 py-6 text-center text-gray-400 text-xs">No data</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Per-user table */}
                    <div className="bg-white shadow-sm sm:rounded-lg overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100">
                            <h3 className="text-base font-semibold text-gray-900">Per User</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        <th className="px-6 py-3 text-left">Name</th>
                                        <th className="px-6 py-3 text-left">Email</th>
                                        <th className="px-6 py-3 text-right">Calls</th>
                                        <th className="px-6 py-3 text-right">Cost</th>
                                        <th className="px-6 py-3 text-right">Last Active</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {perUser.map((r) => (
                                        <tr key={r.user_id ?? 'anon'} className="hover:bg-gray-50">
                                            <td className="px-6 py-3 font-medium">{r.name}</td>
                                            <td className="px-6 py-3 text-gray-500">{r.email}</td>
                                            <td className="px-6 py-3 text-right tabular-nums">{r.calls}</td>
                                            <td className="px-6 py-3 text-right tabular-nums">{fmt(r.cost)}</td>
                                            <td className="px-6 py-3 text-right text-gray-500 text-xs">{r.last_active ? new Date(r.last_active).toLocaleDateString() : '—'}</td>
                                        </tr>
                                    ))}
                                    {perUser.length === 0 && (
                                        <tr><td colSpan={5} className="px-6 py-6 text-center text-gray-400 text-xs">No usage yet</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            </div>
        </AuthenticatedLayout>
    );
}
```

- [ ] **Step 6: Run admin usage tests**

```bash
php artisan test tests/Feature/AdminUsageTest.php
```

Expected: All tests PASS

- [ ] **Step 7: Commit**

```bash
git add app/Http/Controllers/Admin/AdminUsageController.php resources/js/Pages/Admin/Usage.tsx routes/web.php tests/Feature/AdminUsageTest.php
git commit -m "feat: add admin AI usage dashboard"
```

---

## Task 10: User "My Usage" page (controller + route + frontend)

**Files:**
- Create: `app/Http/Controllers/UsageController.php`
- Create: `resources/js/Pages/Usage/Index.tsx`
- Modify: `routes/web.php`
- Create: `tests/Feature/UsageTest.php`

- [ ] **Step 1: Write failing tests**

```php
<?php
// tests/Feature/UsageTest.php

namespace Tests\Feature;

use App\Models\AiUsageLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UsageTest extends TestCase
{
    use RefreshDatabase;

    public function test_requires_auth(): void
    {
        $this->get('/usage')->assertRedirect('/login');
    }

    public function test_user_can_access_own_usage(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get('/usage')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Usage/Index')
                ->has('totalCost')
                ->has('totalCalls')
                ->has('byFeature')
                ->has('byProvider')
                ->has('recentLogs')
            );
    }

    public function test_user_only_sees_own_logs(): void
    {
        $user  = User::factory()->create();
        $other = User::factory()->create();

        AiUsageLog::create([
            'user_id' => $user->id, 'provider' => 'openai', 'model' => 'gpt-4o-mini',
            'feature' => 'ats_score', 'input_tokens' => 500, 'output_tokens' => 200, 'cost_usd' => 0.0002,
        ]);
        AiUsageLog::create([
            'user_id' => $other->id, 'provider' => 'openai', 'model' => 'gpt-4o',
            'feature' => 'ai_suggest', 'input_tokens' => 300, 'output_tokens' => 100, 'cost_usd' => 0.0015,
        ]);

        $response = $this->actingAs($user)->get('/usage');

        $response->assertOk();
        $this->assertEquals(1, $response->json('props.totalCalls'));
        $this->assertEqualsWithDelta(0.0002, $response->json('props.totalCost'), 0.00001);
    }
}
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
php artisan test --filter=UsageTest
```

Expected: FAIL — route not found

- [ ] **Step 3: Create `UsageController`**

```php
<?php
// app/Http/Controllers/UsageController.php

namespace App\Http\Controllers;

use App\Models\AiUsageLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class UsageController extends Controller
{
    public function index(Request $request): Response
    {
        $userId = $request->user()->id;

        $base = AiUsageLog::where('user_id', $userId);

        $totalCost  = (clone $base)->sum('cost_usd');
        $totalCalls = (clone $base)->count();

        $byFeature = (clone $base)
            ->select('feature', DB::raw('COUNT(*) as calls'), DB::raw('SUM(cost_usd) as cost'))
            ->groupBy('feature')
            ->get()
            ->map(fn ($r) => ['feature' => $r->feature, 'calls' => $r->calls, 'cost' => (float) $r->cost])
            ->values();

        $byProvider = (clone $base)
            ->select('provider', DB::raw('COUNT(*) as calls'), DB::raw('SUM(cost_usd) as cost'))
            ->groupBy('provider')
            ->get()
            ->map(fn ($r) => ['provider' => $r->provider, 'calls' => $r->calls, 'cost' => (float) $r->cost])
            ->values();

        $recentLogs = (clone $base)
            ->where('created_at', '>=', now()->subDays(30))
            ->orderByDesc('created_at')
            ->limit(100)
            ->get(['feature', 'provider', 'model', 'cost_usd', 'created_at'])
            ->map(fn ($r) => [
                'feature'    => $r->feature,
                'provider'   => $r->provider,
                'model'      => $r->model,
                'cost_usd'   => (float) $r->cost_usd,
                'created_at' => $r->created_at,
            ])
            ->values();

        return Inertia::render('Usage/Index', [
            'totalCost'  => (float) $totalCost,
            'totalCalls' => $totalCalls,
            'byFeature'  => $byFeature,
            'byProvider' => $byProvider,
            'recentLogs' => $recentLogs,
        ]);
    }
}
```

- [ ] **Step 4: Add route to `routes/web.php`**

Inside the `Route::middleware('auth')->group()` block, add:

```php
use App\Http\Controllers\UsageController;

// inside the group:
Route::get('/usage', [UsageController::class, 'index'])->name('usage.index');
```

The import goes at the top of `routes/web.php` with the other controller imports.

- [ ] **Step 5: Create `resources/js/Pages/Usage/Index.tsx`**

```tsx
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage } from '@inertiajs/react';
import { PageProps } from '@/types';

type FeatureStat  = { feature: string; calls: number; cost: number };
type ProviderStat = { provider: string; calls: number; cost: number };
type LogEntry     = { feature: string; provider: string; model: string; cost_usd: number; created_at: string };

type Props = PageProps<{
    totalCost: number;
    totalCalls: number;
    byFeature: FeatureStat[];
    byProvider: ProviderStat[];
    recentLogs: LogEntry[];
}>;

const fmtShort = (n: number) => `$${n.toFixed(4)}`;
const fmt      = (n: number) => `$${n.toFixed(6)}`;

export default function UsageIndex() {
    const { totalCost, totalCalls, byFeature, byProvider, recentLogs } = usePage<Props>().props;

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">My AI Usage</h2>}
        >
            <Head title="My Usage" />

            <div className="py-12">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8 space-y-6">

                    {/* Summary cards */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white shadow-sm sm:rounded-lg p-6">
                            <p className="text-sm text-gray-500">Total Calls</p>
                            <p className="text-3xl font-bold text-gray-900 mt-1">{totalCalls.toLocaleString()}</p>
                        </div>
                        <div className="bg-white shadow-sm sm:rounded-lg p-6">
                            <p className="text-sm text-gray-500">Total Cost</p>
                            <p className="text-3xl font-bold text-gray-900 mt-1">{fmtShort(totalCost)}</p>
                        </div>
                    </div>

                    {/* By feature + by provider */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white shadow-sm sm:rounded-lg overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100">
                                <h3 className="text-base font-semibold text-gray-900">By Feature</h3>
                            </div>
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        <th className="px-6 py-3 text-left">Feature</th>
                                        <th className="px-6 py-3 text-right">Calls</th>
                                        <th className="px-6 py-3 text-right">Cost</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {byFeature.map((r) => (
                                        <tr key={r.feature} className="hover:bg-gray-50">
                                            <td className="px-6 py-3 font-medium">{r.feature}</td>
                                            <td className="px-6 py-3 text-right tabular-nums">{r.calls}</td>
                                            <td className="px-6 py-3 text-right tabular-nums">{fmtShort(r.cost)}</td>
                                        </tr>
                                    ))}
                                    {byFeature.length === 0 && (
                                        <tr><td colSpan={3} className="px-6 py-6 text-center text-gray-400 text-xs">No usage yet</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="bg-white shadow-sm sm:rounded-lg overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100">
                                <h3 className="text-base font-semibold text-gray-900">By Provider</h3>
                            </div>
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        <th className="px-6 py-3 text-left">Provider</th>
                                        <th className="px-6 py-3 text-right">Calls</th>
                                        <th className="px-6 py-3 text-right">Cost</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {byProvider.map((r) => (
                                        <tr key={r.provider} className="hover:bg-gray-50">
                                            <td className="px-6 py-3 font-medium capitalize">{r.provider}</td>
                                            <td className="px-6 py-3 text-right tabular-nums">{r.calls}</td>
                                            <td className="px-6 py-3 text-right tabular-nums">{fmtShort(r.cost)}</td>
                                        </tr>
                                    ))}
                                    {byProvider.length === 0 && (
                                        <tr><td colSpan={3} className="px-6 py-6 text-center text-gray-400 text-xs">No usage yet</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Recent call history */}
                    <div className="bg-white shadow-sm sm:rounded-lg overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100">
                            <h3 className="text-base font-semibold text-gray-900">Last 30 Days — Call History</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        <th className="px-6 py-3 text-left">Date</th>
                                        <th className="px-6 py-3 text-left">Feature</th>
                                        <th className="px-6 py-3 text-left">Provider</th>
                                        <th className="px-6 py-3 text-left">Model</th>
                                        <th className="px-6 py-3 text-right">Cost</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {recentLogs.map((r, i) => (
                                        <tr key={i} className="hover:bg-gray-50">
                                            <td className="px-6 py-3 text-gray-500 text-xs">{new Date(r.created_at).toLocaleDateString()}</td>
                                            <td className="px-6 py-3">{r.feature}</td>
                                            <td className="px-6 py-3 capitalize text-gray-500">{r.provider}</td>
                                            <td className="px-6 py-3 font-mono text-xs text-gray-500">{r.model}</td>
                                            <td className="px-6 py-3 text-right tabular-nums">{fmt(r.cost_usd)}</td>
                                        </tr>
                                    ))}
                                    {recentLogs.length === 0 && (
                                        <tr><td colSpan={5} className="px-6 py-6 text-center text-gray-400 text-xs">No calls in the last 30 days</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            </div>
        </AuthenticatedLayout>
    );
}
```

- [ ] **Step 6: Run usage tests**

```bash
php artisan test tests/Feature/UsageTest.php
```

Expected: All tests PASS

- [ ] **Step 7: Run full test suite**

```bash
php artisan test
```

Expected: All tests PASS

- [ ] **Step 8: Commit**

```bash
git add app/Http/Controllers/UsageController.php resources/js/Pages/Usage/Index.tsx routes/web.php tests/Feature/UsageTest.php
git commit -m "feat: add user AI usage page"
```

---

## Task 11: TypeScript build check + final verification

**Files:** none new

- [ ] **Step 1: Run TypeScript type-check**

```bash
npm run build
```

Expected: Build succeeds with no TypeScript errors. Output: `✓ built in Xs`

If there are TypeScript errors, fix them before proceeding. Common issues:
- Missing `route()` calls for new named routes — add them to `resources/js/types/global.d.ts` if needed
- Prop type mismatches between controller and TSX — check the `Props` type matches what the controller passes

- [ ] **Step 2: Run full test suite one final time**

```bash
php artisan test
```

Expected: All tests PASS

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "chore: final type-check and test verification for GPT ATS score and usage tracking"
```

---

## Self-Review Checklist (completed inline)

- **Spec coverage:**
  - ✅ GPT-4o-mini for ATS scoring (Task 5)
  - ✅ DB cache on `resumes` with cache-bust endpoint (Tasks 1, 6)
  - ✅ Fallback to local scorer on failure (Task 5)
  - ✅ `ai_model_rates` table with seeded data (Task 2)
  - ✅ `ai_usage_logs` table (Task 3)
  - ✅ `AiUsageLogger` service with cost calculation (Task 4)
  - ✅ Logger wired into AtsScorer (Task 5 — inside `scoreWithGpt`)
  - ✅ Logger wired into web `AiSuggestController` (Task 7)
  - ✅ Logger wired into API `AiSuggestController` (Task 8)
  - ✅ Config keys `openai.ats_model`, `openai.suggest_model` (Task 4)
  - ✅ Admin usage dashboard with date range filter (Task 9)
  - ✅ User usage page with 30-day history (Task 10)
  - ✅ Uses existing `master_admin` middleware (Task 9)
  - ✅ No keyword lists in GPT prompt (Task 5)

- **Placeholder scan:** No TBDs or incomplete steps found.

- **Type consistency:** `AiUsageLogger::log()` signature is consistent across all call sites (Tasks 4, 5, 7, 8). `AiUsageLog` model fields match migration columns. Controller prop names match TSX `Props` types.
