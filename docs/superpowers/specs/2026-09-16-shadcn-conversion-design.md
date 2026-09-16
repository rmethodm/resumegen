# App-wide shadcn/ui conversion — design

Date: 2026-09-16
Status: approved, not yet implemented

## 1. Scope & phasing

Convert all 31 Inertia page components (`resources/js/Pages/**/*.tsx`) to shadcn/ui.
One branch (`shadcn-conversion`), checkpoint-committed per group below. Merge to
main only after the full pass is done and tests are green. No partial deploys
mid-branch.

Group order (each is a checkpoint commit):

1. Foundation — theme, tokens, promoted `Components/ui/*`
2. Auth — Login, Register, ForgotPassword, ResetPassword, ConfirmPassword,
   TwoFactorChallenge, VerifyEmail, ExtensionConnect
3. Workstation — core editor (biggest surface, highest autosave/PDF-preview risk)
4. Kanban + Jobs/Stats (already partly shadcn'd)
5. Dashboard, Resumes/Index, Resumes/Compare, Apply/Wizard, Onboarding/Wizard
6. Settings/Profile — StarterProfile, Profile/Edit + all Profile/Partials forms
7. Shares — Shares/Index, Resumes/PublicShare, ResumeBuilder/LinkPassword
8. Misc — Welcome, Legal/Privacy, Legal/Terms, Admin/Schedule

## 2. Theme & tokens

Adopt the shadcn stock theme already declared in `components.json` (style
`radix-nova`, baseColor `neutral`, CSS vars in `resources/css/app.css`).

Drop the `.ui-craft/tokens.md` DESIGN.md "Flat Design Corporativo" brand tokens
(`#007BFF` accent, Lato, custom radii, etc.) app-wide. Mark `.ui-craft/tokens.md`
and `.ui-craft/brief.md`'s DESIGN.md entry as stale/superseded once this lands.

Tailwind itself stays — shadcn/ui is built on Tailwind. Only the custom token
layer on top of it goes away in favor of shadcn's own theme.

## 3. Component foundation

Move `resources/js/shadcn-demo/components/ui/*` → `resources/js/Components/ui/`
(this matches the `ui` alias already set in `components.json`), overwriting
legacy custom primitives of the same name (e.g. `shell.tsx`). Before deleting
any legacy primitive, check for app-specific props/usages elsewhere in the
codebase that the shadcn replacement doesn't cover, and carry those over.

Domain-specific composite components (resume-preview, bullets-editor,
workstation-format-toolbar, add-job-modal, etc.) are rebuilt to use the shadcn
primitives internally — not replaced wholesale, since they carry resume/job
domain logic that isn't part of shadcn.

## 4. Bells & whistles (maximalist)

- App-wide command palette (cmdk-based)
- sonner toasts replacing any old flash/alert UI
- Page/section transitions
- Skeleton loaders on async content
- Optimistic UI on mutations (drag-and-drop, forms)
- Keyboard shortcuts overlay
- Subtle motion on hover/focus states

Explicit exclusion: nothing here changes autosave debounce timing or the
PDF-preview iframe refresh logic in Workstation — those stay functionally
identical, only re-skinned.

## 5. Testing & verification

Per group checkpoint:
- `php artisan test` (targeted to the group; full suite at group 8)
- `npm run build`
- Dusk browser tests for the Auth and Workstation groups
- Live browser check (real data, real app) per page in that group

Before final merge to main:
- Full `composer run test`
- Full Dusk suite
- Pint on any touched PHP (Blade/DomPDF export templates are untouched —
  separate server-rendered path, out of scope — so this should be minimal)

## 6. Out of scope

- Mobile API (`/api/*` mobile ability) — no UI surface here
- Browser extension's external-facing contract (`/api/extension/*`) — page
  `Auth/ExtensionConnect.tsx` is in scope for restyling, the API contract isn't
- DomPDF Blade export/preview templates — separate render path, not React
- Stripe/Cashier checkout and Billing Portal redirect pages — external, not
  ours to restyle
- `.ui-craft/` skill docs beyond marking the superseded DESIGN.md tokens stale
