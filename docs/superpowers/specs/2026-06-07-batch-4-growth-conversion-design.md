# Batch 4 — Growth & Conversion Design Spec

**Date:** 2026-06-07
**Status:** Approved
**Features:** Social Share Cards (OpenGraph) · Referral Program · Resume A/B Testing · Public Portfolio Page

---

## Pre-flight: Already Implemented (skip these)
- ~~Share Links~~ ✅ — `ResumeShareLink`, `/r/{token}`, `PublicView.tsx`, PDF download, analytics logging
- ~~Analytics Dashboard~~ ✅ — `ResumeShareEvent`, `AnalyticsController`, `Dashboard.tsx` with per-resume stats
- ~~Resume Duplicate~~ ✅ — `POST /builder/{resume}/duplicate` in `ResumeBuilderController@duplicate`

---

## 1. Social Share Cards (OpenGraph)

### Problem
When users share their `/r/{token}` resume link on LinkedIn, X (Twitter), or messaging apps, the link preview shows a blank card. OG tags make the link look professional and drive more clicks.

### Design
- Add a `<x-seo>` Blade slot (or direct `@section`) in `resources/views/app.blade.php` that can be overridden per-page
- For the public resume view, inject OG meta into the `<head>` via **a new Blade partial `resources/views/og-resume.blade.php`** included by `resources/views/app.blade.php` when the `og` data bag is present
- The `PublicResumeController@show` method (currently in `ResumeBuilderController`) sets OG props server-side via `Inertia::share` or a dedicated `og` key in the Inertia page response
- The root `app.blade.php` template is the single place where meta tags live — the OG tags are rendered server-side (not client-side) so crawlers see them

### Data to expose
From the `ResumeShareLink` → `Resume` → `Contact`:
- `og:title` → `"{contact.full_name} — Resume"` or `"{resume.name}"` if no contact
- `og:description` → `"{contact.title if exists} · {resume.name}"` or truncated summary (max 150 chars)
- `og:url` → the canonical `/r/{token}` URL
- `og:type` → `"profile"`
- `og:image` → new endpoint `GET /r/{token}/og-image` (see below)
- `twitter:card` → `"summary_large_image"`
- `twitter:title` / `twitter:description` — same as OG

### OG Image endpoint
`GET /r/{token}/og-image` (unauthenticated, public) — returns a 1200×630 PNG
- Rendered via a new Blade view `resources/views/og-image.blade.php` served through a `OgImageController`
- Uses `barryvdh/laravel-dompdf` to generate a small HTML card (name, title, headline, Resumegen logo) as a PDF-to-PNG — BUT dompdf cannot produce PNG natively, so we use **HTML rendered with `Response::make($html, 200, ['Content-Type' => 'text/html'])`** and rely on the social crawler's own image renderer, **OR** use a pre-built SVG/HTML-based card served as `text/html` that looks like an image preview at the link-preview level
- Simpler approach (no image generation dep): serve a styled HTML page at `/r/{token}/og-image.html` that renders as the preview image via a headless capture — but this requires puppeteer
- **Chosen approach: SVG OG card** — generate an SVG string server-side and return it with `Content-Type: image/svg+xml`. SVG is valid for OG images on most platforms (LinkedIn, Slack, iMessage) and requires zero new deps
  - SVG template: white background, resume name in large text, contact name + title in smaller text, accent color from resume, Resumegen logo text in bottom-right
  - Twitter and some others require raster PNG — we'll add a note in the spec that a future task can add Puppeteer/Browsershot if needed; for now SVG covers 80% of use cases

### Implementation
- New `OgImageController` — `show(string $token)`: load share link + resume + contact, build SVG string, return `response($svg, 200)->header('Content-Type', 'image/svg+xml')->header('Cache-Control', 'public, max-age=3600')`
- Route: `GET /r/{token}/og-image` → `og-image` (unauthenticated, no middleware)
- `PublicResumeController` (currently `ResumeBuilderController@publicView`): pass `og` array as an additional Inertia prop — but Inertia props are JSON, not `<head>` tags. The correct approach is to inject OG data into the Blade template via a **server-side mechanism**
- **Correct approach for Inertia + OG**: Use `Inertia::share(['og' => [...]])` in `HandleInertiaRequests` is wrong (too global). Better: render OG tags in `app.blade.php` by reading them from a **view composer** or via a **session flash** — but the cleanest solution for Inertia is the **`@inertiaHead` directive** (Inertia v2 supports `<Head>` component on the client but that requires JS execution which crawlers won't do)
- **Final approach**: Override the `<head>` in `app.blade.php` to accept an `$og` variable passed from the controller via `Inertia::render(...)->withViewData(['og' => $ogData])`. The `resources/views/app.blade.php` checks `@isset($og)` and renders the meta tags server-side. This is the correct Inertia v1/v2 pattern for SSR-like meta without true SSR.
- `PublicResumeController@show` (public route, unauthenticated): call `->withViewData(['og' => ['title' => ..., 'description' => ..., 'image' => ..., 'url' => ...]])` on the Inertia response

### Route
```
GET /r/{token}/og-image   → OgImageController@show   (public, no auth)
```

### app.blade.php change
In the `<head>`, add:
```php
@isset($og)
    <meta property="og:title" content="{{ $og['title'] }}" />
    <meta property="og:description" content="{{ $og['description'] }}" />
    <meta property="og:url" content="{{ $og['url'] }}" />
    <meta property="og:type" content="profile" />
    <meta property="og:image" content="{{ $og['image'] }}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="{{ $og['title'] }}" />
    <meta name="twitter:description" content="{{ $og['description'] }}" />
    <meta name="twitter:image" content="{{ $og['image'] }}" />
@endisset
```

### Acceptance Criteria
- `/r/{token}` page has OG meta tags in the server-rendered HTML (`view()->source()` contains og:title)
- `/r/{token}/og-image` returns 200 with `Content-Type: image/svg+xml`
- SVG contains resume name and contact name/title
- Expired/inactive share links still return a safe fallback (LinkExpired renders without OG tags)
- Cached for 1 hour (Cache-Control header)

---

## 2. Referral Program

### Problem
Organic word-of-mouth is the cheapest growth channel. A referral program with a clear reward ("Give 1 month free, get 1 month free") turns happy users into sales reps. No competitor among the listed alternatives has a referral program.

### Design
- **Schema changes** (users table migration):
  - `referral_code` — `string(12)`, unique, nullable → auto-generated on first read (lazy)
  - `referred_by_user_id` — nullable FK → `users.id`, `SET NULL` on delete
  - `referral_rewards_earned` — `unsignedTinyInteger`, default 0 — count of free months earned (simple counter; Stripe extension is a future task)
- **Referral flow**: User A shares `https://resumegen.app/r-ref/{code}` → User B clicks → stored in session → User B signs up → `referred_by_user_id` set on User B → When User B first upgrades to Starter+, `referral_rewards_earned` is incremented on User A (logged to `referral_events` table)
- **`referral_events` table**: `id`, `referrer_user_id`, `referred_user_id`, `event_type` (`signup` | `upgrade`), `created_at`
- **Reward value**: Pure tracking for now — admin panel shows referral stats, actual Stripe credit is a manual admin action. A future batch can wire Stripe promo codes automatically.

### Routes
```
GET /referral/{code}        → ReferralController@redirect   (public, no auth)
GET /settings/referral      → ReferralController@show       (auth)
```

### Controllers
- `ReferralController@redirect`: store `referral_code` in session, redirect to `/register`
- `ReferralController@show`: returns `{ referral_code, referral_url, total_signups, total_upgrades, rewards_earned }` for `Referral/Index.tsx`
- Hook into `RegisteredUserController@store` (Breeze): after creating user, check `session('referral_code')`, look up referrer user, set `referred_by_user_id`
- Hook into billing (Cashier Subscription observer already in `AppServiceProvider`): when `plan_tier` changes from `free` → `starter`/`pro`, dispatch `ReferralUpgradeJob` (queued) that increments `referral_rewards_earned` on the referrer if one exists and no upgrade reward was previously given

### UI: Settings/Referral page
- Linked from authenticated sidebar nav ("Refer & Earn" link)
- Shows: unique referral link (copy button), count of signups, count of upgrades, rewards earned (months)
- Simple design — referral link card + stats grid

### User model changes
- `referralCode()` accessor that auto-generates and saves a code if `referral_code` is null (12-char random alphanumeric)
- `referrer()` `BelongsTo` User
- `referrals()` `HasMany` User (via `referred_by_user_id`)

### Acceptance Criteria
- `GET /referral/{code}` stores code in session and redirects to `/register`
- Signing up after visiting a referral link sets `referred_by_user_id` on new user
- Upgrading from free to paid increments `referral_rewards_earned` on referrer (if any)
- `GET /settings/referral` returns user's code, URL, and stats
- Referral code auto-generated on first access (lazy, not migration default)
- `referral_events` table logs both `signup` and `upgrade` events

---

## 3. Resume A/B Testing

### Problem
Users tailoring resumes for the same role don't know which version performs better. Resumegen already tracks views per share link — we just need to surface a side-by-side comparison view for resumes that are variants of each other.

### Design
This extends the existing share analytics infrastructure. No new tracking needed — each resume already has its own share links and view counts.

#### Schema
Migration on `resumes` table:
- `ab_parent_id` — nullable FK → `resumes.id`, `SET NULL` on delete — marks this resume as a B-variant of another

#### Endpoints
- `POST /builder/{resume}/create-variant` → `ResumeBuilderController@createVariant` — duplicates the resume, sets `ab_parent_id` on the copy → returns redirect to new resume's edit page
- `GET /builder/{resume}/ab-compare` → `ResumeBuilderController@abCompare` — returns stats for the resume and its variants (or itself and its siblings if this is a variant)

#### UI: Resume Index
- Resume cards that are A/B variants show a small "A/B" badge and the parent's name
- "Create A/B Variant" button on each resume card (via a dropdown or secondary button)

#### UI: AB Compare page (`ResumeBuilder/AbCompare.tsx`)
- Side-by-side comparison table:
  - Resume name (A / B / C labels)
  - View count
  - Unique visitors
  - PDF downloads
  - Questions submitted
  - "Winner" badge on the row with highest view count
- "Open Editor" link for each variant
- "Delete Variant" (only for variants, not the parent)

#### `Resume` model additions
- `abVariants()` `HasMany` Resume (via `ab_parent_id`)
- `abParent()` `BelongsTo` Resume

#### Stat aggregation in `abCompare`
Reuses `AnalyticsController` aggregation logic — for each resume in the group (parent + variants), sum `ResumeShareEvent` rows by type. The compare endpoint returns an array of `{ id, name, view_count, unique_visitors, pdf_downloads, questions_submitted }`.

#### `ResumeRow` TypeScript additions
- `ab_parent_id: number | null`

### Acceptance Criteria
- "Create A/B Variant" creates a duplicate with `ab_parent_id` set
- A/B badge appears on variant cards in Index
- Compare page shows all variants' stats side-by-side
- Winner badge shown on highest-view-count variant
- Deleting parent sets `ab_parent_id` to null on variants (cascade SET NULL)
- No tier gate — available to all users (uses existing features)

---

## 4. Public Portfolio Page

### Problem
Users want to share all their professional materials in one link — "here's my resume site." A portfolio page at a predictable URL lets users send one link to recruiters instead of juggling multiple share links.

### Design
#### Schema
Migration on `users` table:
- `portfolio_slug` — `string(30)`, unique, nullable — user's chosen public handle (e.g. `john-doe`)
- `portfolio_headline` — `string(150)`, nullable — e.g. "Full-Stack Engineer open to remote roles"
- `portfolio_bio` — `text`, nullable — 3–5 sentence bio
- `portfolio_is_public` — `boolean`, default `false` — master on/off switch

#### Route
```
GET /p/{slug}   → PortfolioController@show   (unauthenticated)
```

If `portfolio_is_public` is false or slug not found: 404.

Lists all resumes with at least one **active** share link — shows resume name + "View Resume" link (to the share link URL). Does **not** expose private resumes.

#### Settings UI (`Settings/Portfolio.tsx`)
- Linked from sidebar nav under "Public Portfolio"
- Fields: slug (alphanumeric + hyphens, 3–30 chars, unique), headline, bio, toggle on/off
- Slug validation: regex `/^[a-z0-9-]+$/`, unique among users
- "Preview" button opens `/p/{slug}` in a new tab

#### Public page (`Portfolio/Show.tsx`)
- Public, unauthenticated, uses `PublicLayout`
- Shows: user's name (from `profile.full_name` or `name`), headline, bio, list of public resumes
- Each resume entry: resume name + template chip + "View Resume" CTA → goes to the resume's share link
- CTA footer: "Made with Resumegen · Build yours free →"

#### OG tags
The portfolio page also gets OG tags (extends the mechanism from Feature 1):
- `og:title` → `"{name}'s Portfolio — Resumegen"`
- `og:description` → headline (or "Professional resume portfolio")

### Acceptance Criteria
- `GET /p/{slug}` shows portfolio page for a user with `portfolio_is_public = true`
- Lists only resumes with at least one active share link
- 404 if slug not found or portfolio is private
- `Settings/Portfolio.tsx` page lets user set slug, headline, bio, toggle on/off
- Slug is unique — validation returns 422 with clear error if taken
- OG tags present on public portfolio page
- Portfolio link shown in sidebar nav (Settings section)

---

## Testing Strategy

- `OgImageTest` (Feature): `/r/{token}/og-image` returns SVG, `/r/{token}` HTML contains og:title, expired token returns 404 not OG
- `ReferralTest` (Feature): redirect stores session code, signup sets referred_by, upgrade increments rewards_earned, referral_events logged, show endpoint returns correct stats
- `AbTestingTest` (Feature): create-variant creates resume with ab_parent_id, compare endpoint returns stats for group, ab_parent_id badge in index response, SET NULL on parent delete
- `PortfolioTest` (Feature): public page shows resumes with active links, private portfolio returns 404, slug uniqueness enforced, OG tags in response

---

## Out of Scope
- Puppeteer/Browsershot PNG OG images (SVG only for now)
- Automatic Stripe promo code generation for referrals (manual admin action for now)
- Referral leaderboard
- Portfolio custom domain (future batch)
- Portfolio analytics (future batch)
- A/B testing with traffic splitting on a single share link (too complex; current design compares separate resumes)
