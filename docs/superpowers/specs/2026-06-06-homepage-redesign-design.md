# Homepage Redesign — Design Spec

**Date:** 2026-06-06  
**Status:** Approved  
**Scope:** Replace `resources/js/Pages/Welcome.tsx` with a full SaaS product page layout

---

## Overview

Redesign the Resumegen marketing homepage from a minimal 3-section page (hero + feature cards + pricing strip) into a full SaaS product page that builds trust, explains value, and converts visitors to sign-ups.

**Design direction:** SaaS Product Page — clean white background, indigo/purple brand color (`#4f46e5` → `#7c3aed`), professional nav, app screenshot in hero, and progressive disclosure of features and pricing as the user scrolls.

---

## Page Sections (top to bottom)

### 1. Navigation Bar

- Sticky, white background, 60px height, 1px bottom border (`#e5e7eb`)
- **Left:** Logo icon (28×28 rounded gradient square) + "Resumegen" wordmark
- **Center:** Text links — Features, Templates, Pricing (smooth-scroll anchors to page sections)
- **Right:** "Log in" ghost link (indigo text) + "Get started free" primary button (gradient)
- Logged-in state: replace right side with "Go to app →" button only

### 2. Hero Section

- Light gradient background (`#fafafe` → `#fff`), centered layout, `64px` vertical padding
- **Badge:** Small pill — "✦ AI-Powered Resume Builder" in indigo on `#eef2ff`
- **Headline (h1):** "Land more interviews with a **standout resume**" — "standout resume" rendered as indigo gradient text (`from-[#4f46e5] to-[#7c3aed]`)
- **Subtext:** One sentence covering AI suggestions, templates, and share links
- **CTAs:** Primary button "Create my resume — it's free →" + ghost "▶ See how it works" (scrolls to How It Works)
- **Trust note:** Small text below CTAs — "No credit card required · Free forever plan"
- **App screenshot mockup:** Framed wireframe showing the editor (sidebar, content panel, PDF preview panel) with an "✦ AI improved" chip visible. Uses `border`, `box-shadow`, and rounded corners. Not a real screenshot — a styled HTML mockup.

### 3. Social Proof Bar

- Light gray background (`#f8fafc`), `1px` borders top and bottom
- 4 inline stats: **2,400+** resumes built · **8** ATS-ready templates · **Free** to get started · **AI** powered suggestions
- Each stat: large bold number + small gray label

### 4. How It Works

- White background, `64px` vertical padding, `id="how-it-works"` anchor
- **Section title:** "Get hired in 3 steps"
- **3 numbered steps** in a row, connected by a subtle horizontal line between circles:
  1. Import or start fresh — "Upload your LinkedIn PDF or start from scratch. AI parses your experience."
  2. Let AI improve it — "Generate stronger bullets, rewrite summary, tailor to any job description."
  3. Share & apply — "Download as PDF or DOCX, or share a live public link."
- Step numbers: 44×44 indigo gradient circles with white numerals

### 5. Feature Highlights

- Light lavender background (`#fafafe`), `64px` vertical padding, `id="features"` anchor
- **Section title:** "Everything you need to get the job"
- **2×2 grid** of feature cards (white, `border`, `border-radius: 12px`, `padding: 24px`):
  1. **AI Writing Assistant** — bullets, summaries, skills. Tag: "30 AI uses free/mo"
  2. **8 Professional Templates** — all included on every plan. Tag: "All templates free"
  3. **Public Share Links** — live link, recruiter questions, instant notifications. Tag: "Free on all plans"
  4. **Job Tailoring + ATS Score** — match score, keywords, tailored summary. Tag: "Starter+"
- Each card has a 40×40 indigo gradient icon square

### 6. Pricing

- White background, `64px` vertical padding, `id="pricing"` anchor
- **Section title:** "Simple, transparent pricing"
- **3-column plan grid:**

| | Free | Starter | Pro |
|---|---|---|---|
| Price | $0 | $9/mo | $19/mo |
| Resumes | 5 | 5 | Unlimited |
| AI suggestions | 30/mo | Unlimited | 500/mo |
| Templates | All 8 | All 8 | All 8 |
| Share links | ✓ | ✓ | ✓ |
| DOCX export | ✗ | ✓ | ✓ |
| Job tailoring | ✗ | ✓ | ✓ |
| ATS scoring | 3/mo | Unlimited | Unlimited |
| Interview coach | 3/mo | Unlimited | Unlimited |
| Cover letters | 3 | 5 | Unlimited |

- **Starter** column highlighted with indigo border, `box-shadow`, and "⭐ Most Popular" pill badge
- Each plan has a CTA button: Free → "Get started free", Starter → "Start for $9/mo" (indigo gradient), Pro → "Go Pro"

### 7. Footer CTA

- Dark indigo background (`linear-gradient(135deg, #1e1b4b, #312e81)`)
- Headline: "Ready to land your next interview?"
- Subtext: "Join thousands of job seekers who built their resume with Resumegen"
- CTA button: white background, indigo text — "Create my resume — it's free →"

### 8. Footer

- Dark navy background (`#0f172a`)
- Logo wordmark (left) · copyright (center) · Privacy / Terms / Contact links (right)

---

## Technical Notes

- **File:** `resources/js/Pages/Welcome.tsx` — full replacement
- **Routing:** All CTAs use Ziggy `route()` helper — logged-in users go to `dashboard`, guests go to `register`
- **Smooth scroll:** Nav links (`#features`, `#pricing`, `#how-it-works`) use `href` anchors with CSS `scroll-behavior: smooth` on `html`
- **Auth-aware:** Nav right side and all CTA buttons check `auth.user` prop — show "Go to app →" when logged in
- **No new routes or backend changes required** — purely frontend
- **No new dependencies** — Tailwind v3 utility classes only
- **Inertia Head:** Title remains "ResumeGen — Build a resume that gets you hired"

---

## Out of Scope

- Real app screenshots (mockup wireframe only)
- Testimonials section (not requested)
- FAQ section (not requested)
- Mobile responsive refinements (handled naturally by Tailwind, but not the focus of this spec)
- Any backend or routing changes
