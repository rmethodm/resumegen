# Tailored Resume Versions — Design Spec

**Date:** 2026-06-22  
**Status:** Approved  
**Scope:** Resume variant creation, labeling, dashboard grouping, per-variant share links, encryption prep

---

## Problem

Users need to maintain one canonical resume and create tailored copies targeted at specific job openings. The existing A/B variant system has the right data model but the UX is confusing: jargon ("A/B"), no labeling on creation, and a flat dashboard that makes it hard to tell which version is for which job.

---

## Decisions Deferred (TBD)

- **Master/variant sync**: When the master is edited after variants exist, variants stay frozen (independent copies). A "push to variants" sync feature is explicitly out of scope for v1. Revisit when users request it.
- **Tier limits**: Proposed: Free = 2 tailored versions per master, Starter/Pro/Agency = unlimited. Confirm before implementation.

---

## Data Model

**One migration** on the `resumes` table:

```
variant_company    string(255) nullable
variant_job_title  string(255) nullable
```

`ab_parent_id` (self-referencing FK) already exists and remains unchanged. No new tables.

**Relationships (existing, unchanged):**
- `Resume::abParent()` — BelongsTo parent
- `Resume::abVariants()` — HasMany variants
- Cascade delete: deleting master deletes all its variants (model-level observer, already wired)

---

## Feature 1 — Creation Flow

**Entry point:** "+" Tailored Version" button on each master resume row in the dashboard. Replaces the existing "A/B" button.

**Modal fields:**
| Field | Required | Default |
|---|---|---|
| Version name | Yes | Master resume name |
| Company | No | blank |
| Job title | No | blank |

**Controller change:** `ResumeBuilderController::createVariant()` accepts `name`, `variant_company`, `variant_job_title` from request. Clones master via `replicate()`, saves fields, redirects to editor.

**Tier gate:** If user is on Free and already has 2 variants for this master, flash `featureGate` with `required_tier = 'starter'`. Add `UserLimits::variantLimit(User $user): int|null` (null = unlimited).

---

## Feature 2 — Dashboard UX

**Grouping:** Variants no longer appear as flat rows. Master resume row shows a **"N tailored versions ▸"** toggle. Clicking expands an indented list of variants beneath it.

**Variant row displays:**
- Version name (with "Tailored" pill replacing "A/B" badge)
- Company + job title if set (e.g. "Google — Senior Engineer")
- Last updated date
- Actions: Edit, Delete, Share (opens share link for that variant)

**Share action:** Clicking "Share" on a variant row creates/returns the active share link for that variant and copies it to clipboard — same as the existing `shareUrl` endpoint, called with the variant's ID.

---

## Feature 3 — Editor Banner

When a user opens a variant in the editor, a non-dismissible info banner appears at the top:

> "Tailored version of **[Master Resume Name]** → [link back to master]. Its share link is independent — distributing it only shares this version."

No structural change to the share link system. Variants already have independent `ResumeShareLink` rows.

**Props needed:** Pass `masterResume: { id, name } | null` from `ResumeBuilderController::edit()` when `$resume->ab_parent_id` is set.

---

## Encryption Prep (non-breaking)

**Migration:** Add `encrypted_at timestamp nullable` to `users` table. No logic wired.

**Model stub:** Add `isEncrypted(): bool { return false; }` to `User` model as the future integration point.

These changes have zero effect on existing behavior. They exist solely to make the column available when encryption is designed.

---

## Files Touched

| File | Change |
|---|---|
| `database/migrations/...add_variant_fields_to_resumes.php` | New: `variant_company`, `variant_job_title` |
| `database/migrations/...add_encrypted_at_to_users.php` | New: `encrypted_at` prep column |
| `app/Models/Resume.php` | Add `variant_company`, `variant_job_title` to `$fillable` |
| `app/Models/User.php` | Add `isEncrypted()` stub, `encrypted_at` cast |
| `app/Services/UserLimits.php` | Add `variantLimit()` method |
| `app/Http/Controllers/ResumeBuilderController.php` | Update `createVariant()`, update `edit()` to pass `masterResume` prop |
| `resources/js/Pages/ResumeBuilder/Index.tsx` | Grouping UI, modal, rename "A/B" → "Tailored Version" |
| `resources/js/Pages/ResumeBuilder/Edit.tsx` | Variant banner |
| `resources/js/types/index.d.ts` | Add `variant_company`, `variant_job_title` to `ResumeRow` type |
| `tests/Feature/ResumeVariantTest.php` | Update existing tests, add new cases for labeling + tier gate |

---

## Out of Scope (v1)

- Sync master changes to variants
- Variant analytics (separate heatmap per variant — variants already inherit this)
- Bulk-create variants from a job list
- Encryption implementation (prep only)
