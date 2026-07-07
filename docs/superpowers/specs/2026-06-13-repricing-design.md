# Repricing — 4-Tier Reposition (design)

Date: 2026-06-13
Status: approved design, pending spec review

## Problem

Tiers are gated on quantity, but the most valuable lever — teams/orgs — is ungated
(`/org/create` sits behind plain `auth`, so a free user can create an org today).
Free is a complete product (5 resumes), Starter ($9) matches Free on the headline
metric and is dead weight, and Agency ($49) is just "Pro + more AI" in code with no
real reason to exist over Pro. AI limits are mispriced as stingy when they cost
~$1/mo at the ceiling.

## Decision: keep 4 tiers, reposition every gate

| | **Free** | **Starter $9** | **Pro $19** | **Agency $49** |
|---|---|---|---|---|
| Resumes | 2 | 10 | unlimited | unlimited |
| Cover letters | 1 | 10 | unlimited | unlimited |
| Job applications | 3 | unlimited | unlimited | unlimited |
| Templates | 4 | all 9 | all 9 | all 9 |
| DOCX export | ✗ | ✓ | ✓ | ✓ |
| AI calls / mo | 25 | 150 | 500 | 1000 |
| **Org creation + team seats** | ✗ | ✗ | ✗ | **✓** |

Repositioning logic:
- **Free** — 2 resumes / 1 letter so tailoring a 3rd application hits a wall, but AI
  bumped **10 → 25** so the hook feels generous (near-zero cost). Job apps stay at 3.
- **Starter $9** — real headline win over Free: 10 resumes, all templates, DOCX,
  unlimited jobs, 150 AI. The "serious individual job seeker" tier.
- **Pro $19** — unchanged: unlimited everything for one person.
- **Agency $49** — the fix. Gate **org/workspace creation and team seats** to Agency.
  This is the only differentiator over Pro.

## Enforcement

**Hard enforce for everyone** (no grandfathering), with one exception:

- **Resume / letter / job caps** — applied at point of creation immediately for all
  users. A user over the new cap simply cannot create more until they upgrade or
  delete down. We do **not** build a UI to lock/hide existing over-cap resumes
  (destructive, YAGNI) — existing content stays readable/editable; only *new*
  creation is blocked. This is the honest meaning of hard-enforce for count gates.
- **Org features** — gated at the controller for all non-Agency users immediately,
  including users who already created an org under the old rules. A non-Agency org
  owner is blocked from org create/show/invite (this falls out naturally from
  gating the routes — no migration needed).

**Override account:** `rmethodm@outlook.com` gets full access regardless of tier.
Implemented by setting that user's `is_master_admin = true` and changing
`User::planTier()`'s master-admin arm to resolve to **`'agency'`** instead of `'pro'`
(master admin = god mode = highest tier, including teams). This is the laziest correct
override and benefits all master admins.

## Implementation surface

1. **`app/Services/UserLimits.php`** — single source of truth. Update:
   - `resumeLimit()`: free `2`, starter `10`, pro/agency `null`. Restrictive default `2`.
   - `coverLetterLimit()`: free `1`, starter `10`, pro/agency `null`. Default `1`.
   - `jobLimit()`: free `3`, else `null` (unchanged).
   - `aiMonthlyLimit()` reads `config/ai.php` (below) — no logic change, config carries values.
   - Add **`canCreateOrg(User): bool`** → `planTier() === 'agency'`.
   - Add **`canUseOrg(User): bool`** → `planTier() === 'agency'` (for existing-org gating).
2. **`config/ai.php`** `monthly_limits` — set `free => 25, starter => 150, pro => 500,
   agency => 1000`.
3. **`app/Models/User.php`** — `planTier()` master-admin arm `'pro'` → `'agency'`.
   Seed/set `is_master_admin = true` on `rmethodm@outlook.com`.
4. **`app/Http/Controllers/OrgController.php`** — `create()` and `store()` call
   `UserLimits::canCreateOrg()` → flash `featureGate` (required_tier `agency`) and
   `back()` if false. `show()` calls `canUseOrg()` → same gate. Invite routes already
   sit behind `org.admin`; add a `canUseOrg()` check in `OrgInviteController@store`
   so a downgraded owner can't add seats.
5. **Billing UI** (`Billing/Index.tsx`) — update the 4 cards to reflect new numbers
   and surface "Team workspace + seats" as the Agency headline feature.

## Testing

Extend `tests/Feature/TierLimitsTest.php`:
- Free user blocked creating a 3rd resume / 2nd cover letter; can create up to the cap.
- Starter blocked at 11th resume; Pro/Agency unlimited.
- Free AI limit is 25 (assert `UserLimits::aiMonthlyLimit` per tier reads new config).
- `canCreateOrg` true only for Agency; non-Agency `GET /org/create` and `POST /org`
  get the `featureGate` redirect; existing non-Agency org owner blocked from
  `GET /org` and `POST /org/invite`.
- Master admin (`is_master_admin`) resolves to `agency` and passes all gates.

Use `UserFactory` states (`->free()`, `->starter()`, `->pro()`) plus an agency state
(add `->agency()` if missing) — not real Stripe subscriptions.

## Out of scope

- No resume/org locking UI for existing over-cap content.
- No change to Stripe price IDs or checkout flow (tiers and prices unchanged).
- AI lockdown (moderation / user-id / max_tokens) is a separate spec.
