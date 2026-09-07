# Context

## Current Task
Branch `NewEditor` (as of 2026-09-07): editor rework landed 2026-08-31 — inline-markdown
bullets (`App\Support\InlineMarkdown` + `resources/js/lib/bullet-markdown.ts`), a skills
editor, bullet-style/skills-layout format toolbar, and an in-editor DomPDF preview frame.
The guest resume flow / builder subdomain was added and reverted the same day (net zero).

Since then: the guest landing page (`Welcome.tsx` + `Marketing*` components) was reworked
with a "see it in action" section and an FAQ block; OAuth login (Google/GitHub/Microsoft
via Socialite, `App\Http\Controllers\Auth\SocialiteController`) was added alongside password
login (commits `9bc1d2b9`, `2e35e4a1`); and DESIGN.md theming was stripped for a plain
black-and-white token spine (commit `349f98a7`), with DESIGN.md tooling/skills removed.

## Next Steps
1. Register real OAuth app credentials (Google Cloud Console, GitHub Developer Settings,
   Azure app registration) and fill `GOOGLE_/GITHUB_/MICROSOFT_CLIENT_ID/SECRET` in `.env`
   — the redirect flow works but the provider client IDs are still empty.
2. Decide on merging `NewEditor` into `main` (landing, OAuth, editor rework, and B&W
   chrome are already browser-verified locally).
