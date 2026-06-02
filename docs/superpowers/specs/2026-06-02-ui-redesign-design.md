# UI Redesign — Indigo Refined Theme

**Date:** 2026-06-02
**Status:** Approved

## Goal

Replace the plain Laravel Breeze default styling with a polished "Indigo Refined" design system across the entire app. Layout: top nav + full-width content on a soft purple-tinted background. Resume Builder edit page gets only the new top nav (its split-panel interior is unchanged).

---

## Design Tokens

These Tailwind values define the system. Every file uses only these; no grey-100/gray-800 defaults.

| Token | Value | Use |
|---|---|---|
| App background | `bg-[#f5f5fb]` | Page body behind all content |
| Nav background | `bg-white` | Top nav bar |
| Card background | `bg-white` | All cards, panels, tables |
| Sub-nav / table head bg | `bg-[#fafafe]` | Table `<thead>`, sub-tab bar |
| Border | `border-[#eeeef5]` | All card, nav, input borders |
| Text primary | `text-[#0f0f1a]` | Headings, strong labels |
| Text secondary | `text-[#71717a]` | Body text, inactive nav |
| Text muted | `text-[#a0a0b0]` | Subtitles, table col headers |
| Text nav muted | `text-[#c4c4d0]` | Table `<thead>` labels |
| Accent | `text-[#4f46e5]` / `bg-[#4f46e5]` | Links, deltas, active borders |
| Accent dark | `text-[#4338ca]` | Active nav text |
| Accent gradient | `bg-gradient-to-br from-[#4f46e5] to-[#7c3aed]` | Logo, primary buttons, bars |
| Accent light | `bg-[#eef2ff]` | Pill bg, active nav bg, badge bg |
| Danger | `text-red-600` / `hover:bg-red-50` | Delete actions |
| Success | `text-emerald-600` / `bg-emerald-50` | High ATS badge |

---

## Component System

### Top Nav (`AuthenticatedLayout`)
- `bg-white border-b border-[#eeeef5] h-[52px]`
- Logo: 30×30 rounded-lg with accent gradient, app name `text-[15px] font-extrabold tracking-tight text-[#0f0f1a]`
- Nav links: `text-sm font-medium text-[#71717a]`, active: `text-[#4338ca] font-semibold border-b-2 border-[#4f46e5]` (underline indicator, same pattern as mockup)
- User dropdown: avatar circle with accent gradient (initials or plain circle), name `text-sm text-[#71717a]`
- Remove the separate grey `<header>` band — page titles move inside the page body
- Mobile hamburger menu preserved but reflowed with new colors

### Page Body Wrapper
- `min-h-screen bg-[#f5f5fb]`
- Content padding: `py-8 px-6` (or `py-8` with `mx-auto max-w-{size} px-4 sm:px-6 lg:px-8` per page)

### Cards / Panels
- `bg-white border border-[#eeeef5] rounded-xl shadow-[0_1px_3px_rgba(79,70,229,0.05)]`
- Card header (section title row): `px-6 py-4 border-b border-[#eeeef5]` — title `text-sm font-bold text-[#0f0f1a]`

### Page Title Block (inside body, not a nav band)
- `<h1>` or `<h2>`: `text-xl font-extrabold tracking-tight text-[#0f0f1a]`
- Subtitle: `text-sm text-[#a0a0b0] mt-1`
- Row: title left, primary action button right — `flex items-start justify-between mb-6`

### Primary Button
- `bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] text-white text-sm font-semibold rounded-lg px-4 py-2 hover:opacity-90 transition-opacity`

### Secondary Button
- `border border-[#eeeef5] bg-white text-sm font-medium text-[#71717a] rounded-lg px-4 py-2 hover:bg-[#fafafe]`

### Danger Action (inline link style)
- `text-sm font-medium text-red-600 hover:text-red-700`

### Text Input / Select
- `border-[#eeeef5] rounded-lg text-sm text-[#0f0f1a] focus:border-[#4f46e5] focus:ring-[#4f46e5]`

### Tables
- Container: card styles above, `overflow-hidden`
- `<thead>`: `bg-[#fafafe] border-b border-[#eeeef5]`
- `<th>`: `text-[10px] font-bold uppercase tracking-wide text-[#c4c4d0] px-5 py-3`
- `<tr>` hover: `hover:bg-[#fafafe] transition-colors`
- `<td>`: `px-5 py-3 text-sm text-[#71717a]`
- Primary cell value: `font-semibold text-[#0f0f1a]`
- Dividers: `divide-y divide-[#f5f5fb]`

### Stat Cards
- Card styles above, `p-5`
- Number: `text-3xl font-extrabold tracking-tight text-[#0f0f1a]`
- Label: `text-[10px] font-bold uppercase tracking-wide text-[#a0a0b0] mt-1`
- Delta: `text-xs font-semibold text-[#4f46e5] mt-1`

### Pills / Badges
- Default: `bg-[#eef2ff] text-[#4f46e5] text-[10px] font-bold px-2 py-0.5 rounded-full`
- Success (high ATS): `bg-emerald-50 text-emerald-700`
- Warning: `bg-amber-50 text-amber-700`
- Danger: `bg-red-50 text-red-700`

### Empty State
- `border-2 border-dashed border-[#eeeef5] rounded-xl py-16 text-center`
- Text: `text-sm text-[#a0a0b0]`

### Progress Bar
- Track: `h-1 bg-[#eeeef5] rounded-full`
- Fill: `h-1 bg-gradient-to-r from-[#4f46e5] to-[#7c3aed] rounded-full`

---

## Per-Page Changes

### 1. `Layouts/AuthenticatedLayout.tsx`
Complete rewrite. Remove grey `bg-gray-100`, remove `<header>` band prop, replace nav with new top nav. Keep mobile dropdown but restyled. `children` renders in `<main className="min-h-screen bg-[#f5f5fb]">`. The `header` prop is removed — pages own their own page titles.

### 2. `Components/NavLink.tsx`
Active: `border-b-2 border-[#4f46e5] text-[#4338ca] font-semibold`. Inactive: `text-[#71717a] hover:text-[#4338ca] border-b-2 border-transparent`.

### 3. `Components/PrimaryButton.tsx`
Gradient primary button per design tokens above.

### 4. `Components/SecondaryButton.tsx`
Secondary button per design tokens above.

### 5. `Components/TextInput.tsx`
Updated border + focus ring to use `[#eeeef5]` / `[#4f46e5]`.

### 6. `Layouts/GuestLayout.tsx`
Background: `bg-[#f5f5fb]`. Card: white, `rounded-2xl border border-[#eeeef5] shadow-[0_4px_24px_rgba(79,70,229,0.08)]`. Logo block at top uses accent gradient square + app name. Remove `ApplicationLogo` SVG.

### 7. `Pages/Welcome.tsx`
- Nav matches the authenticated top nav style (white, `border-b border-[#eeeef5]`), logo same as app
- Hero: background `bg-[#f5f5fb]`, headline `text-[#0f0f1a]`, CTA button uses primary button style
- Feature pills: card style with `border-[#eeeef5]`
- Pricing strip: keep dark `bg-slate-900` (contrast intentional)
- Remove emoji from feature items (replace with small accent-colored icon boxes)

### 8. `Pages/Dashboard.tsx`
- Remove `AuthenticatedLayout header` prop (pass `undefined`)
- Page title block: "Dashboard" + subtitle "Welcome back, {name}"
- 4-column stat row: Resumes, Views, Downloads, Messages
- Section heading "Your Resumes" with "View all →" link
- Resume cards in a responsive grid (4-col desktop, 2-col tablet, 1-col mobile) — each card shows name, last-edited, ATS score badge + progress bar, view count
- Empty state when no resumes

### 9. `Pages/ResumeBuilder/Index.tsx`
- Remove `header` prop
- Page title "Resumes" + subtitle "{n} resumes"
- Primary action button "+ New Resume" top right
- Resume card grid (same card style as Dashboard) — each card: name, last edited, Edit / Duplicate / Delete actions
- Inline create form becomes a modal or inline top-of-grid card (keep existing logic, restyle)
- Empty state with dashed border

### 10. `Pages/CoverLetter/Index.tsx`
- Remove `header` prop
- Page title "Cover Letters" + count subtitle
- Card grid (3-col desktop): name, template key badge, last edited, Edit / Delete actions
- Template picker modal restyled: white bg, `rounded-2xl`, card options use accent-hover style

### 11. `Pages/CoverLetter/Edit.tsx`
- Restyle page wrapper and form panels to card style

### 12. `Pages/Jobs/Index.tsx`
- Remove `header` prop
- Page title "Job Applications"
- Table inside a card — thead and rows per design tokens
- Status pills: map each status to appropriate pill color (applied→accent, interviewing→amber, offered→success, rejected→danger, saved/closed→muted)
- Inline add-row form: input cells styled with new input token

### 13. `Pages/Jobs/Edit.tsx`
- Restyle form card

### 14. `Pages/Billing/Index.tsx`
- Remove `header` prop
- Page title "Billing & Plan"
- Current plan card: `border-2 border-[#4f46e5] bg-[#eef2ff]`; progress bar uses accent gradient
- Upgrade card: white card, primary button
- Interval toggle: styled like font-family toggle in the resume builder (mini pill tabs)

### 15. `Pages/Usage/Index.tsx`
- Remove `header` prop
- Page title "AI Usage"
- Stat cards + tables per design tokens

### 16. `Pages/Admin/Usage.tsx`
- Same treatment as Usage/Index

### 17. `Pages/Admin/Users/Index.tsx`
- Table in card per design tokens

### 18. `Pages/Profile/Edit.tsx` + Partials
- Remove `header` prop
- Page title "Profile"
- Each section (profile info, password, danger zone) is a separate card
- Danger zone card: red accent on delete button, `border-red-100`

### 19. `Pages/ResumeBuilder/Edit.tsx`
- Replace existing nav bar with the new `AuthenticatedLayout` top nav only
- The split-panel editor interior (panels, toolbar, preview) is unchanged
- The edit page currently does NOT use `AuthenticatedLayout` — it has its own inline nav. Replace that inline nav with the shared new nav markup

### 20. `Pages/Auth/*` (Login, Register, ForgotPassword, ResetPassword, VerifyEmail, ConfirmPassword)
- These use `GuestLayout` which is restyled in item 6 — no per-page changes needed beyond ensuring `PrimaryButton` and `TextInput` pick up new component styles

---

## Out of Scope
- `PublicView.tsx` / `PublicLayout.tsx` (public-facing resume share page — different audience, keep as-is)
- `LinkExpired.tsx` (public error page — keep as-is)
- Resume template components inside `Edit.tsx` (the PDF preview templates — unchanged)
- Any backend/Laravel changes

---

## Testing Notes
- TypeScript build (`npm run build`) must pass after all changes
- Verify nav active states work correctly for each route
- Verify mobile nav dropdown works on each page
- Verify `atLimit` banner/state still works on Resume Builder Index
- Verify billing upgrade + manage flows render correctly
