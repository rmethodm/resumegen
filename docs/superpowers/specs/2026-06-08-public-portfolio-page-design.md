# Public Portfolio Page — Design Spec

**Date:** 2026-06-08
**Status:** Approved
**Approach:** Lightweight — columns on `users` + new `portfolio_messages` table

## Overview

A personal micro-site at `/p/{slug}` combining an identity landing page with a resume hub. Visitors see the owner's bio and social links, browse their publicly-shared resumes, and can send a direct message via a contact form. Users claim a custom vanity slug; the page is live as soon as a slug is set.

---

## Data Model

### Columns added to `users`

| column | type | notes |
|---|---|---|
| `portfolio_slug` | `string`, unique, nullable | 3–30 chars, `[a-z0-9-]` only. Reserved words blocked server-side. |
| `portfolio_bio` | `text`, nullable | Max 500 chars. |
| `portfolio_links` | `json`, nullable | Array of `{ platform, url }`. Platforms: `linkedin`, `github`, `x`, `website`. |

### New `portfolio_messages` table

Append-only (no `updated_at`). Model uses `public const UPDATED_AT = null`.

| column | type |
|---|---|
| `id` | bigint PK |
| `user_id` | FK → users, cascadeDelete |
| `sender_name` | string |
| `sender_email` | string |
| `message` | text |
| `read_at` | timestamp, nullable |
| `created_at` | timestamp |

### Reserved slugs (blocked on validation)

`admin`, `api`, `builder`, `career`, `jobs`, `cover-letters`, `billing`, `profile`, `onboarding`, `register`, `login`, `logout`, `p`, `r`, `password`, `dashboard`, `usage`, `webhooks`

---

## Routes

### Public (no auth)

| method | path | name | throttle |
|---|---|---|---|
| `GET` | `/p/{slug}` | `portfolio.show` | — |
| `POST` | `/p/{slug}/contact` | `portfolio.contact` | `5,1` |
| `GET` | `/portfolio/check-slug` | `portfolio.check-slug` | `10,1` |

### Authenticated

| method | path | name |
|---|---|---|
| `PATCH` | `/user/portfolio` | `portfolio.update` |

---

## Controllers

### `PortfolioController`

**`show(string $slug)`**
- Look up user by `portfolio_slug` — 404 if not found or slug is null.
- Eager-load active, non-expired share links with their resume (`is_active = true`, `expires_at IS NULL OR expires_at > now()`).
- Pass to `Portfolio/Show.tsx`: `owner` (name, bio, links), `resumes` (id, name, template, updated_at, share token), `auth.user`.

**`contact(Request $request, string $slug)`**
- Look up user by slug — 404 if not found.
- Validate: `sender_name` (required, max 100), `sender_email` (required, email), `message` (required, max 2000).
- Run `AbuseFilter::check($request->message)` — return 422 on violation.
- Store `PortfolioMessage` record.
- Dispatch `NewPortfolioMessageMail` to the portfolio owner.
- Return `back()->with('contactSent', true)`.

**`checkSlug(Request $request)`**
- Validate: `slug` (required, string, 3–30 chars, regex `[a-z0-9-]+`).
- Check reserved words list.
- Query `users` for existing slug (excluding current user if authenticated).
- Return `{ available: bool }`.

### `ProfileController` extension

**`updatePortfolio(Request $request)`**
- Validate: `portfolio_slug` (nullable, unique ignoring self, format regex, not reserved), `portfolio_bio` (nullable, max 500), `portfolio_links` (nullable, array, each item has `platform` and `url`).
- Update the three columns on the authenticated user.
- Return `back()->with('status', 'portfolio-updated')`.

---

## Frontend

### `Portfolio/Show.tsx`

Uses `PublicLayout`. Three sections:

**Hero**
- Initials avatar (colored circle — same style as Contact Manager).
- Owner name (large), `portfolio_bio` below.
- Row of social link icon-pills: LinkedIn, GitHub, X, website.
- Top-right: "Build yours free →" CTA — shown only when `!auth.user`.

**Resume Grid**
- Heading: "Resumes".
- Cards matching dashboard grid style: resume name, template badge, last-updated date, "Download PDF" button (`GET /r/{token}/pdf`).
- Hidden entirely if the user has no active share links.

**Contact**
- Card with fields: name, email, message textarea, send button.
- On success (`contactSent` flash), form replaced with "Message sent!" confirmation.
- Client-side: disable submit while pending.

### Profile settings — Portfolio tab

New "Portfolio" section on `Profile/Edit.tsx` (or a dedicated tab if the profile page already has tabs):

- Slug input with debounced availability check (calls `portfolio.check-slug`). Shows green check / red × indicator.
- Bio textarea (500 char counter).
- Four labeled URL inputs for social links (LinkedIn, GitHub, X, website).
- "View your portfolio →" link (shown once slug is saved).
- Save button → `PATCH /user/portfolio`.

### Dashboard / Nav

- "Portfolio" link in `AuthenticatedLayout` sidebar.
- Unread `portfolio_messages` count badge — same style as the existing unread questions badge on share links.

---

## Email

`NewPortfolioMessageMail` — sends to the portfolio owner when a contact form message is received. Plain layout consistent with `NewQuestionReceived`. Subject: `"New message from {sender_name} via your portfolio"`. Body: sender name, email, message, link to portfolio settings.

---

## Edge Cases

| scenario | behaviour |
|---|---|
| Slug not set | `GET /p/{slug}` returns 404 |
| No active share links | Resume grid section hidden; page still valid |
| Expired share link | Excluded from the resume grid query |
| Slug taken | `updatePortfolio` returns validation error; check-slug returns `available: false` |
| Contact spam | `throttle:5,1` + `AbuseFilter` on message body |
| Race condition on slug claim | DB unique constraint is final backstop |

---

## Tests (`tests/Feature/PortfolioTest.php`)

1. Portfolio page renders for a valid slug
2. 404 for unknown slug
3. Only active non-expired share-link resumes appear on portfolio
4. Contact form stores message and fires mail
5. Contact form blocked by AbuseFilter
6. Contact form throttled
7. Slug uniqueness enforced on `updatePortfolio`
8. Reserved slug rejected on `updatePortfolio`
9. Unauthenticated user can view portfolio and submit contact form
10. Authenticated user does not see "Build yours free" CTA

---

## Files

### New
- `database/migrations/..._add_portfolio_columns_to_users_table.php`
- `database/migrations/..._create_portfolio_messages_table.php`
- `app/Http/Controllers/PortfolioController.php`
- `app/Models/PortfolioMessage.php`
- `app/Mail/NewPortfolioMessageMail.php`
- `resources/js/Pages/Portfolio/Show.tsx`
- `tests/Feature/PortfolioTest.php`

### Modified
- `app/Http/Controllers/ProfileController.php` — add `updatePortfolio()`
- `routes/web.php` — add portfolio routes
- `resources/js/Pages/Profile/Edit.tsx` — add Portfolio settings section
- `resources/js/Layouts/AuthenticatedLayout.tsx` — add Portfolio nav link + message badge
- `resources/js/types/index.d.ts` — add `PortfolioMessage` type, extend `User` with portfolio fields
