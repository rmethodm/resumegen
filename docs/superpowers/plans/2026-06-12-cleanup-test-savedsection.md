# Cleanup: Test Page & SavedSection Remnants Implementation Plan (Effort A)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the orphaned `Test/Index.tsx` page and the dangling `SavedSection` remnants left by the "Various Claude updates" commit, leaving the codebase free of dead references.

**Architecture:** Pure deletion. The `SavedSection` model/controller/policy and the `/test` route were already removed; this finishes the job by deleting the orphaned React page, the broken `User` relationship, the leftover factory, and the dead TS interface. `@dnd-kit` stays (used by real features).

**Tech Stack:** Laravel 13 / PHP 8.4, React 18 / TypeScript, PHPUnit 12.

**Spec:** `docs/superpowers/specs/2026-06-12-ai-foundation-cleanup-autocomplete-design.md` (Effort A)

---

## File Structure

- Delete `resources/js/Pages/Test/Index.tsx` (and the now-empty `resources/js/Pages/Test/` dir).
- Delete `database/factories/SavedSectionFactory.php`.
- Modify `app/Models/User.php` — remove `savedSections()` (and the `HasMany` import if unused).
- Modify `resources/js/types/index.d.ts` — remove the `SavedSectionData` interface.

This is a single cohesive cleanup; one task with verification.

---

## Task 1: Remove the orphaned Test page and SavedSection remnants

**Files:**
- Delete: `resources/js/Pages/Test/Index.tsx`
- Delete: `database/factories/SavedSectionFactory.php`
- Modify: `app/Models/User.php`
- Modify: `resources/js/types/index.d.ts`

- [ ] **Step 1: Confirm the Test page is truly orphaned**

Run:
```bash
grep -rn -E "Pages/Test|from.*['\"].*Test/Index|route\('test'\)|name\('test'\)|'/test'" resources/js routes app 2>/dev/null | grep -v node_modules || echo "ORPHAN CONFIRMED — no references"
```
Expected: `ORPHAN CONFIRMED — no references`. If anything prints, STOP and report — the page is still wired in and must not be deleted blindly.

- [ ] **Step 2: Delete the Test page and its directory**

Run:
```bash
rm resources/js/Pages/Test/Index.tsx
rmdir resources/js/Pages/Test 2>/dev/null || true
```
Expected: file removed; directory removed if empty.

- [ ] **Step 3: Delete the orphaned SavedSection factory**

Run: `rm database/factories/SavedSectionFactory.php`
Expected: removed.

- [ ] **Step 4: Remove the `savedSections()` relationship from User**

In `app/Models/User.php`, delete this method:

```php
    public function savedSections(): HasMany
    {
        return $this->hasMany(SavedSection::class);
    }
```

Then check whether `HasMany` is still used elsewhere in the file:

Run: `grep -c "HasMany" app/Models/User.php`
- If the count is `0`, also remove the import line `use Illuminate\Database\Eloquent\Relations\HasMany;` from the top of `app/Models/User.php`.
- If the count is `> 0` (another `hasMany` relationship returns `HasMany`), leave the import.

- [ ] **Step 5: Remove the dead `SavedSectionData` TS interface**

In `resources/js/types/index.d.ts`, delete the `SavedSectionData` interface block (around line 352). First view it to capture its exact bounds:

Run: `grep -n -A8 "export interface SavedSectionData" resources/js/types/index.d.ts`

Delete the full `export interface SavedSectionData { ... }` block shown. Then confirm nothing imports it:

Run: `grep -rn "SavedSectionData" resources/js | grep -v node_modules || echo "no remaining usages"`
Expected: `no remaining usages`.

- [ ] **Step 6: Verify zero remnants remain**

Run:
```bash
grep -rn -E "SavedSection|savedSections|saved-sections|Pages/Test" app routes resources database 2>/dev/null | grep -v node_modules || echo "CLEAN — no remnants"
```
Expected: `CLEAN — no remnants`.

- [ ] **Step 7: Verify the app still boots**

Run: `php artisan route:list 2>&1 | head -3`
Expected: routes print, no fatal error (exit 0).

- [ ] **Step 8: Type-check + build the frontend**

Run: `npm run build`
Expected: `tsc` passes (no reference to the deleted page/interface), `vite build` completes.

- [ ] **Step 9: Run the full test suite**

Run: `php artisan test --compact`
Expected: PASS. (Deletion only — nothing should regress. If a pre-existing unrelated failure appears, note it but do not fix it here.)

- [ ] **Step 10: Run Pint**

Run: `vendor/bin/pint --dirty --format agent`
Expected: clean (only `User.php` touched on the PHP side).

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "chore: remove orphaned Test page and SavedSection remnants"
```

---

## Self-Review Notes

- **Spec coverage:** Delete `Test/Index.tsx` → Step 2. Remove `User::savedSections()` + `HasMany`
  import → Step 4. Delete `SavedSectionFactory` → Step 3. Remove `SavedSectionData` interface →
  Step 5. Keep `@dnd-kit` → never touched. Verifications → Steps 6–10.
- **Safety gate:** Step 1 aborts if the Test page turns out to be referenced; Step 4 conditionally
  keeps the `HasMany` import based on a live grep rather than assuming.
- **No new tests:** this is deletion; the existing suite (Step 9) proves nothing broke. Per project
  convention, no test files are removed.
