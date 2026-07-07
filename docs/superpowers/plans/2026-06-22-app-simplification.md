# App Simplification Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove five feature clusters that add complexity without competitive lift, leaving the core resume-builder, ATS matching, AI writing, and billing tiers intact.

**Architecture:** Each task is an independent deletion — they do not depend on each other and can be executed in any order or in parallel. Each task ends with a passing test suite and a commit. No new code is introduced; the measure of success is fewer files.

**Tech Stack:** Laravel 13, PHP 8.4, React 18 / TypeScript, Inertia.js v2, SQLite, Stripe Cashier v16

## Research Background

This plan was derived from a competitive analysis (2026-06-22) comparing Resumegen against Resume.io, Zety, Kickresume, Enhancv, Novoresume, RxResume, and Rezi. Key finding: the minimum viable feature set for a competitive resume builder is (1) PDF download, (2) ATS keyword analysis vs a pasted JD, (3) at least one AI writing feature, and (4) a real-time quality score. Resumegen already has all four. Everything in this plan is beyond that baseline.

## Global Constraints

- Run `vendor/bin/pint --dirty --format agent` after every PHP file change
- Run `php artisan test --compact` after each task before committing
- Do NOT touch: `ResumeBuilder/Edit.tsx`, `AiSuggestionController`, `AtsMatchPanel`, `ResumeStrengthScorer`, `UserLimits` (except where noted per task), `BillingController`, `ResumeBuilderController`
- SQLite is the DB — drop columns via migration, not `ALTER TABLE`
- All test files listed under each task should be **deleted**, not emptied

---

## Task 1: Remove Job Applications Tracker

The job tracker (kanban board, contacts, follow-up reminders) is a separate product vertical. No competitor ships this inside a resume builder. Removing it cuts ~8 files backend, ~6 files frontend, 1 console command, 1 mail class, 2 migrations' worth of columns, and 6 test files.

**Files to delete:**
- `app/Http/Controllers/JobApplicationController.php`
- `app/Http/Controllers/Api/JobApplicationController.php`
- `app/Http/Controllers/ApplicationContactController.php`
- `app/Models/JobApplication.php`
- `app/Models/ApplicationContact.php`
- `app/Policies/JobApplicationPolicy.php`
- `app/Console/Commands/SendFollowUpReminders.php`
- `app/Mail/FollowUpReminderMail.php`
- `resources/js/Pages/Jobs/Index.tsx`
- `resources/js/Pages/Jobs/Edit.tsx`
- `resources/js/Pages/Jobs/SwimlanePill.tsx`
- `resources/js/Pages/Jobs/SwimlaneRow.tsx`
- `resources/js/Pages/Jobs/SwimlaneView.tsx`
- `tests/Feature/JobApplicationTest.php`
- `tests/Feature/KanbanJobTrackerTest.php`
- `tests/Feature/ApplicationContactTest.php`
- `tests/Feature/FollowUpReminderTest.php`
- `tests/Feature/Api/JobApplicationApiTest.php`

**Files to modify:**
- `routes/web.php` — remove lines 137–142 (jobs routes) and line 30 (`use JobApplicationController`)
- `routes/api.php` — remove any job-application API routes
- `routes/console.php` — remove `SendFollowUpReminders` schedule entry if present
- `app/Models/Resume.php` — remove `job_application_id` from fillable/casts, remove the `jobApplication()` relation
- `app/Models/User.php` — remove `jobApplications()` relation if present
- `app/Services/UserLimits.php` — remove `maxJobApplications()` method and any `job_application` match arms
- `database/migrations/2026_06_08_144306_add_job_application_id_to_resumes_table.php` — write a new drop-column migration instead of deleting this file (migrations are append-only)
- Navigation component (search `resources/js` for "jobs.index" link) — remove the Jobs nav item

**Steps:**

- [ ] **Step 1: Write a drop-column migration**

```bash
php artisan make:migration drop_job_application_id_from_resumes_table --no-interaction
```

In the generated migration's `up()`:
```php
Schema::table('resumes', function (Blueprint $table) {
    $table->dropColumn('job_application_id');
});
```
`down()` can be empty (`//`).

- [ ] **Step 2: Run the migration**

```bash
php artisan migrate
```

- [ ] **Step 3: Delete backend files**

```bash
rm app/Http/Controllers/JobApplicationController.php
rm app/Http/Controllers/Api/JobApplicationController.php
rm app/Http/Controllers/ApplicationContactController.php
rm app/Models/JobApplication.php
rm app/Models/ApplicationContact.php
rm app/Policies/JobApplicationPolicy.php
rm app/Console/Commands/SendFollowUpReminders.php
rm app/Mail/FollowUpReminderMail.php
```

- [ ] **Step 4: Delete frontend files**

```bash
rm resources/js/Pages/Jobs/Index.tsx
rm resources/js/Pages/Jobs/Edit.tsx
rm resources/js/Pages/Jobs/SwimlanePill.tsx
rm resources/js/Pages/Jobs/SwimlaneRow.tsx
rm resources/js/Pages/Jobs/SwimlaneView.tsx
```

- [ ] **Step 5: Delete test files**

```bash
rm tests/Feature/JobApplicationTest.php
rm tests/Feature/KanbanJobTrackerTest.php
rm tests/Feature/ApplicationContactTest.php
rm tests/Feature/FollowUpReminderTest.php
rm tests/Feature/Api/JobApplicationApiTest.php
rm tests/Feature/ResumeJobTaggingTest.php
```

- [ ] **Step 6: Remove routes**

In `routes/web.php`, delete:
- The `use App\Http\Controllers\JobApplicationController;` import
- The jobs route block:
  ```php
  Route::get('/jobs', [JobApplicationController::class, 'index'])->name('jobs.index');
  Route::post('/jobs', [JobApplicationController::class, 'store'])->name('jobs.store');
  Route::get('/jobs/{application}', [JobApplicationController::class, 'edit'])->name('jobs.edit');
  Route::put('/jobs/{application}', [JobApplicationController::class, 'update'])->name('jobs.update');
  Route::delete('/jobs/{application}', [JobApplicationController::class, 'destroy'])->name('jobs.destroy');
  ```

Check `routes/api.php` for any `JobApplicationController` references and remove them.

- [ ] **Step 7: Clean up models**

In `app/Models/Resume.php`:
- Remove `job_application_id` from `$fillable`
- Remove `jobApplication()` belongs-to relation

In `app/Models/User.php`:
- Remove `jobApplications()` has-many relation if present

- [ ] **Step 8: Clean up UserLimits**

In `app/Services/UserLimits.php`:
- Remove `maxJobApplications()` method
- Remove any `match` arm referencing `'job_application'` or `'jobs'`

- [ ] **Step 9: Remove nav link**

Search for the Jobs nav item:
```bash
grep -r "jobs.index" resources/js --include="*.tsx" -l
```
Remove the nav link from the found file(s).

- [ ] **Step 10: Remove console schedule**

```bash
grep -n "SendFollowUpReminders\|FollowUp" routes/console.php
```
Delete the matching line if found.

- [ ] **Step 11: Run Pint**

```bash
vendor/bin/pint --dirty --format agent
```

- [ ] **Step 12: Run tests**

```bash
php artisan test --compact
```
Expected: all pass (the deleted test files are gone, not failing).

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "remove: job applications tracker"
```

---

## Task 2: Remove Referral Rewards System

The referral system (codes, events, Stripe reward grants, reward counter) is pre-launch infrastructure. No competitor in the analysis offers this before finding product-market fit. Removing it cuts: 1 service, 1 action, 1 model, 2 migrations' worth of columns, 1 controller, 2 frontend pages, 1 admin controller/page, and 4 test files.

**Files to delete:**
- `app/Services/ReferralRewardService.php`
- `app/Actions/EnsureReferralCode.php`
- `app/Models/ReferralEvent.php`
- `app/Http/Controllers/ReferralController.php`
- `app/Http/Controllers/Admin/AdminReferralController.php`
- `resources/js/Pages/Referral/Index.tsx`
- `resources/js/Pages/Admin/Referrals/Index.tsx`
- `tests/Feature/ReferralTest.php`
- `tests/Feature/ReferralUpgradeTest.php`
- `tests/Feature/AdminReferralsTest.php`

**Files to modify:**
- `app/Providers/AppServiceProvider.php` — remove `ReferralRewardService::grantIfEligible($user)` call from subscription observer (~line 79) and remove the `use` import
- `app/Http/Controllers/Auth/RegisteredUserController.php` — remove `EnsureReferralCode` dispatch if present
- `routes/web.php` — remove referral routes (lines ~151, 186, 238)
- `app/Models/User.php` — remove `referral_code`, `referred_by`, `referral_rewards_earned` from fillable/casts; remove `referredBy()` relation
- Write a new migration to drop referral columns from `users` table

**Steps:**

- [ ] **Step 1: Write a drop-columns migration**

```bash
php artisan make:migration drop_referral_fields_from_users_table --no-interaction
```

In `up()`:
```php
Schema::table('users', function (Blueprint $table) {
    $table->dropColumn(['referral_code', 'referred_by', 'referral_rewards_earned']);
});
```
`down()` can be empty.

- [ ] **Step 2: Run the migration**

```bash
php artisan migrate
```

- [ ] **Step 3: Remove AppServiceProvider wiring**

In `app/Providers/AppServiceProvider.php`:
- Delete `use App\Services\ReferralRewardService;`
- Delete the `ReferralRewardService::grantIfEligible($user);` line inside the subscription observer

- [ ] **Step 4: Delete backend files**

```bash
rm app/Services/ReferralRewardService.php
rm app/Actions/EnsureReferralCode.php
rm app/Models/ReferralEvent.php
rm app/Http/Controllers/ReferralController.php
rm app/Http/Controllers/Admin/AdminReferralController.php
```

- [ ] **Step 5: Delete frontend files**

```bash
rm resources/js/Pages/Referral/Index.tsx
rm resources/js/Pages/Admin/Referrals/Index.tsx
```

- [ ] **Step 6: Delete test files**

```bash
rm tests/Feature/ReferralTest.php
rm tests/Feature/ReferralUpgradeTest.php
rm tests/Feature/AdminReferralsTest.php
```

- [ ] **Step 7: Remove routes**

In `routes/web.php`, remove:
- `Route::get('/settings/referral', ...)` (~line 151)
- `Route::get('/ref/{code}', ...)` (~line 186)
- `Route::get('/referrals', [AdminReferralController::class, 'index'])` (~line 238)
- All related `use` imports at the top of the file

- [ ] **Step 8: Clean up User model**

In `app/Models/User.php`:
- Remove `referral_code`, `referred_by`, `referral_rewards_earned` from `$fillable`
- Remove those columns from `$casts` if present
- Remove `referredBy()` and `referrals()` relations if present

- [ ] **Step 9: Remove nav/settings links**

```bash
grep -r "referral" resources/js --include="*.tsx" -l
```
Remove any referral links from nav or settings pages found.

- [ ] **Step 10: Run Pint**

```bash
vendor/bin/pint --dirty --format agent
```

- [ ] **Step 11: Run tests**

```bash
php artisan test --compact
```

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "remove: referral rewards system"
```

---

## Task 3: Remove Agency Tier & Team/Org Workspace

The Agency tier and Organization (team workspace) features add multi-tenancy complexity — invite flows, org admin middleware, org resume views, member management — for a tier that generates near-zero revenue at this stage. The research found no competitor offers team features before finding PMF. This removes ~6 controllers, ~2 models, ~4 frontend pages, 3 migrations' worth of columns/tables, and 2 test files.

**Files to delete:**
- `app/Http/Controllers/OrgController.php`
- `app/Http/Controllers/OrgInviteController.php`
- `app/Http/Controllers/OrgJoinController.php`
- `app/Http/Controllers/OrgResumeController.php`
- `app/Http/Controllers/Admin/AdminOrganizationController.php`
- `app/Models/Organization.php`
- `app/Models/OrganizationMember.php`
- `app/Models/RecruiterNote.php`
- `tests/Feature/OrgTest.php`
- `tests/Feature/OrgGateTest.php`
- `tests/Feature/AdminOrganizationsTest.php`
- Any `resources/js/Pages/Org/` directory

**Files to modify:**
- `routes/web.php` — remove all `/org` routes (~lines 172–191) and `toggle-agency` admin route (~line 229)
- `app/Services/UserLimits.php` — remove `hasTeamWorkspace()`, `isAgency()` methods; collapse Agency arms in `match` expressions to the same value as Pro, or to the default
- `app/Models/User.php` — remove `organization()` relation, `is_agency` from fillable/casts
- `app/Http/Controllers/Admin/AdminUserController.php` — remove `toggleAgency()` method
- `database/` — write a drop-column migration for `is_agency` on `users`; write a drop-table migration for `organizations` and `organization_members` tables

**Note on billing:** Keep the Agency Stripe price IDs in `config/services.php` and keep the `'agency'` match arm in `UserLimits::tierFromPriceId()` (so existing subscribers don't break), but collapse Agency limits to equal Pro limits throughout `UserLimits`.

**Steps:**

- [ ] **Step 1: Write drop migrations**

```bash
php artisan make:migration drop_agency_org_tables --no-interaction
```

In `up()`:
```php
Schema::dropIfExists('organization_members');
Schema::dropIfExists('organizations');
Schema::table('users', function (Blueprint $table) {
    $table->dropColumn('is_agency');
});
```
`down()` can be empty.

- [ ] **Step 2: Run the migration**

```bash
php artisan migrate
```

- [ ] **Step 3: Delete backend files**

```bash
rm app/Http/Controllers/OrgController.php
rm app/Http/Controllers/OrgInviteController.php
rm app/Http/Controllers/OrgJoinController.php
rm app/Http/Controllers/OrgResumeController.php
rm app/Http/Controllers/Admin/AdminOrganizationController.php
rm app/Models/Organization.php
rm app/Models/OrganizationMember.php
rm app/Models/RecruiterNote.php
```

- [ ] **Step 4: Delete test files**

```bash
rm tests/Feature/OrgTest.php
rm tests/Feature/OrgGateTest.php
rm tests/Feature/AdminOrganizationsTest.php
```

- [ ] **Step 5: Delete frontend Org pages**

```bash
find resources/js/Pages -name "Org*" -o -path "*/Org/*" | xargs rm -f
```

- [ ] **Step 6: Remove routes**

In `routes/web.php`, remove the entire `/org` route group (~lines 172–191) and the `toggle-agency` admin route (~line 229). Remove all `use` imports for Org controllers.

- [ ] **Step 7: Collapse Agency limits in UserLimits**

In `app/Services/UserLimits.php`:
- Remove `hasTeamWorkspace()` and `isAgency()` methods entirely
- In each `match` expression, change the `'agency' => ...` arm to return the same value as `'pro'`
- Keep `'agency'` as a valid tier string in `tierFromPriceId()` so existing Stripe subscribers don't break

- [ ] **Step 8: Clean up User model**

In `app/Models/User.php`:
- Remove `is_agency` from `$fillable` and `$casts`
- Remove `organization()` and `organizationMembers()` relations
- In `planTier()`, change `'is_agency' → 'agency'` logic to just fall through to `plan_tier` column

- [ ] **Step 9: Remove toggleAgency from AdminUserController**

In `app/Http/Controllers/Admin/AdminUserController.php`:
- Delete the `toggleAgency()` method

- [ ] **Step 10: Remove nav/settings links**

```bash
grep -r "org\." resources/js --include="*.tsx" -l
```
Remove any org links from nav, settings, and billing pages.

Also remove the Agency tier card from `resources/js/Pages/Billing/Index.tsx` if it renders as a distinct tier.

- [ ] **Step 11: Run Pint**

```bash
vendor/bin/pint --dirty --format agent
```

- [ ] **Step 12: Run tests**

```bash
php artisan test --compact
```

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "remove: agency tier and org/team workspace"
```

---

## Task 4: Remove Resume Strength Snapshots

The `ResumeStrengthSnapshot` model and its prune command store time-series strength score history. This is a nice-to-have analytics feature with no user-facing surface in the current UI. The live Strength Scorer (in Edit.tsx) is unaffected — only the snapshot persistence is removed.

**Files to delete:**
- `app/Models/ResumeStrengthSnapshot.php`
- `app/Console/Commands/PruneStrengthSnapshots.php`

**Files to modify:**
- Any controller or service that calls `ResumeStrengthSnapshot::create()` or similar — find with `grep -r "ResumeStrengthSnapshot" app/`
- `routes/console.php` — remove the prune schedule entry
- Write a drop-table migration for `resume_strength_snapshots`

**Steps:**

- [ ] **Step 1: Find all usages**

```bash
grep -r "ResumeStrengthSnapshot\|strength_snapshot" app/ routes/ --include="*.php" -l
```
Note every file returned.

- [ ] **Step 2: Write a drop-table migration**

```bash
php artisan make:migration drop_resume_strength_snapshots_table --no-interaction
```

In `up()`:
```php
Schema::dropIfExists('resume_strength_snapshots');
```

- [ ] **Step 3: Run the migration**

```bash
php artisan migrate
```

- [ ] **Step 4: Remove snapshot writes from all callers**

For each file found in Step 1 (except the model and command being deleted), remove the `ResumeStrengthSnapshot::create(...)` call and its `use` import.

- [ ] **Step 5: Delete files**

```bash
rm app/Models/ResumeStrengthSnapshot.php
rm app/Console/Commands/PruneStrengthSnapshots.php
```

- [ ] **Step 6: Remove from console schedule**

```bash
grep -n "PruneStrengthSnapshots\|strength.snapshot" routes/console.php
```
Delete the matching line.

- [ ] **Step 7: Remove from Resume model booted()**

In `app/Models/Resume.php`, check if `ResumeStrengthSnapshot` is referenced in the `deleting` observer inside `booted()`. If so, remove that block.

- [ ] **Step 8: Run Pint**

```bash
vendor/bin/pint --dirty --format agent
```

- [ ] **Step 9: Run tests**

```bash
php artisan test --compact --filter=StrengthScore
```
Then full suite:
```bash
php artisan test --compact
```

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "remove: resume strength snapshots"
```

---

## Task 5: Demote Interview Coach to Single AI Button

The Interview Coach is a dedicated panel (`InterviewCoachPanel.tsx`) with its own controller, note-taking model, and routes. Competitors (Kickresume) offer this as a thin "generate interview questions" button — not a panel with persistent notes. This task replaces the panel with a single AI button in the builder sidebar and removes all the persistence infrastructure.

**Files to delete:**
- `app/Http/Controllers/InterviewNoteController.php`
- `app/Models/InterviewNote.php`
- `resources/js/Pages/ResumeBuilder/Partials/InterviewCoachPanel.tsx`
- `tests/Feature/InterviewNoteTest.php`

**Files to modify:**
- `app/Http/Controllers/InterviewCoachController.php` — keep the `coach()` method (it powers the AI call), but remove any note-saving logic
- `routes/web.php` — remove interview note routes; keep the `builder.interview-coach` POST route
- `resources/js/Pages/ResumeBuilder/Edit.tsx` — replace the `<InterviewCoachPanel>` component import/render with a single "Generate interview questions" AI button that calls the existing `builder.interview-coach` endpoint and displays the response in a modal or inline textarea
- Write a drop-table migration for `interview_notes`
- `tests/Feature/InterviewCoachTest.php` — keep but simplify: remove note-related assertions, keep the AI-call smoke test

**Steps:**

- [ ] **Step 1: Write a drop-table migration**

```bash
php artisan make:migration drop_interview_notes_table --no-interaction
```

In `up()`:
```php
Schema::dropIfExists('interview_notes');
```

- [ ] **Step 2: Run the migration**

```bash
php artisan migrate
```

- [ ] **Step 3: Delete note infrastructure**

```bash
rm app/Http/Controllers/InterviewNoteController.php
rm app/Models/InterviewNote.php
rm tests/Feature/InterviewNoteTest.php
```

- [ ] **Step 4: Remove note routes**

In `routes/web.php`, remove any routes pointing to `InterviewNoteController`. Keep the `builder.interview-coach` POST route.

- [ ] **Step 5: Clean up InterviewCoachController**

In `app/Http/Controllers/InterviewCoachController.php`:
- Remove any `InterviewNote::create()` or note-saving logic
- Remove the `use App\Models\InterviewNote;` import
- The `coach()` method should just call `AiService`, return the text, and nothing else

- [ ] **Step 6: Replace InterviewCoachPanel with a button in Edit.tsx**

In `resources/js/Pages/ResumeBuilder/Edit.tsx`:
- Remove the `import InterviewCoachPanel` line
- Remove the `<InterviewCoachPanel ... />` render
- Add a simple button in the sidebar AI section (near other AI buttons) that POSTs to `route('builder.interview-coach')` and displays the result:

```tsx
{/* ponytail: inline, no dedicated panel — result shown in a simple textarea */}
<button
  onClick={() => {
    router.post(route('builder.interview-coach', resume.id), {}, {
      onSuccess: (page) => setInterviewQuestions(page.props.questions as string),
    });
  }}
  className="w-full text-sm btn-secondary"
>
  Generate interview questions
</button>
{interviewQuestions && (
  <textarea
    readOnly
    value={interviewQuestions}
    className="mt-2 w-full text-xs rounded border p-2 h-32 resize-none"
  />
)}
```

Add `const [interviewQuestions, setInterviewQuestions] = useState('');` near other state declarations.

- [ ] **Step 7: Delete the panel file**

```bash
rm resources/js/Pages/ResumeBuilder/Partials/InterviewCoachPanel.tsx
```

- [ ] **Step 8: Run Pint**

```bash
vendor/bin/pint --dirty --format agent
```

- [ ] **Step 9: Run tests**

```bash
php artisan test --compact --filter=InterviewCoach
```
Then full suite:
```bash
php artisan test --compact
```

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "simplify: interview coach → single AI button, remove note persistence"
```

---

## Execution Order Recommendation

These tasks are fully independent. Recommended order for lowest risk:

1. **Task 4** (Snapshots) — smallest blast radius, pure deletion
2. **Task 1** (Job Applications) — self-contained vertical, no shared models
3. **Task 2** (Referral) — one AppServiceProvider hook to remove
4. **Task 5** (Interview Coach) — requires a small Edit.tsx edit
5. **Task 3** (Agency/Org) — largest task, most UserLimits changes

After all tasks: run the full test suite once and check `php artisan route:list` for any dangling routes referencing deleted controllers.

```bash
php artisan test --compact
php artisan route:list --except-vendor | grep -E "job|org|referral|interview.note"
```
The second command should return nothing.
