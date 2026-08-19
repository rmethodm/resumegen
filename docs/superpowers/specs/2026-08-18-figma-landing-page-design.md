# Resumegen Landing Page — Figma Import Design

**Date:** 2026-08-18  
**Status:** Draft for user review (not implemented)  
**Source:** [Figma — AI Resume Builder Landing Page](https://www.figma.com/design/x2dD7sjzUJlStypqxyFAjz/AI-Resume-Builder-Landing-Page---Website-Designs---Free-Website-Templates---Web-Design-Inspiration--Community-?node-id=0-1)  
**File key:** `x2dD7sjzUJlStypqxyFAjz` · Page `0:1` · Main frame `Desktop - Light Mode` (`2:599`) / `Screen` (`2:2`)

---

## Goal

Replace the current guest marketing experience at `/` (`resources/js/Pages/Welcome.tsx`) with a long-scroll landing page adapted from the Figma community template, rebranded for **Resumegen**, with **no paid pricing**.

Success looks like: a visitor can scroll the full story (hero → trust → features → how it works → origin → FAQ → CTA), understand Resumegen is free forever, and convert via Register / Log in (or Dashboard if already signed in), with visuals that feel like the Figma while staying on Resumegen design tokens.

---

## Locked decisions

| Topic | Decision |
|---|---|
| Scope | Implement as Resumegen landing page (not Figma-only reference work) |
| Monetization | Adapt to free forever — **no pricing section / no Pro plan cards** |
| Section set | Full Figma structure **minus pricing**, including product-origin/about |
| Visual approach | Figma look, **mapped to Resumegen tokens** (no parallel ResumeLM theme) |
| Origin story | Product-origin story + placeholder photo until a real asset is supplied |
| Architecture | Section components under `Components/marketing/` composed by `Welcome.tsx` |
| Route | Replace existing `/` Welcome in place (no temporary `/landing` route) |

---

## Information architecture

### Page flow (top → bottom)

1. **Sticky nav** — BrandMark, anchors (Features, How it works, About, FAQ), Log in + primary CTA  
2. **Hero** — Free-forever badge, headline, supporting copy, primary CTA, secondary “See how it works”, resume preview mock  
3. **Logo / trust strip** — “Trusted by candidates at …” style row (adapt company marks from Figma exports or simple text/logo placeholders)  
4. **Features** — Multi-card / multi-step feature storytelling from Figma, Resumegen-accurate capabilities only  
5. **How it works** — Short numbered steps toward first resume / share / export  
6. **Product origin** — “Why we built Resumegen” layout (image + story + optional links); no ResumeLM/UBC bio  
7. **FAQ** — Accordion Q&A rewritten for Resumegen (free forever, ATS, share links, AI caps if relevant, privacy)  
8. **Final CTA** — Strong close: create resume / go to app  
9. **Footer** — Copyright, support/contact as appropriate, minimal social/legal links if already used elsewhere  

### Explicitly out of scope

- Pricing / `$20` Pro / “use your own API keys” as a product promise (Resumegen does not ship that model)  
- ResumeLM branding, open-source GitHub CTA as a primary conversion path (unless we later add a real public repo link by product decision)  
- Billing, paywalls, upgrade CTAs  
- Pixel-perfect recreation of every Figma decorative node if tokens already express the same hierarchy  

### Auth-aware CTA behavior

| State | Primary CTA | Secondary |
|---|---|---|
| Guest | `register` (“Create my resume” / “Get started”) | `login` in nav; `#how-it-works` in hero |
| Logged in | `dashboard` (“Go to app”) | Same anchors |

---

## Visual system

- **Feel:** Soft marketing page — generous vertical rhythm, rounded cards, light surfaces, soft accent washes (Figma “blob” energy).  
- **Tokens:** Use existing Resumegen Tailwind/semantic tokens (`brand`, `brand-soft`, `brand-subtle`, `surface`, `surface-border`, `ink`, `ink-muted`, `ink-faint`, radii, `font-display` / `font-sans`, motion utilities).  
- **Landing-only decoration:** Soft gradient blobs / radial washes allowed on Welcome only, built from brand-tint opacities — not a second theme file for the whole app.  
- **A11y:** Keep skip link; visible focus rings; accordion keyboard behavior; `prefers-reduced-motion`; contrast on text/icons.  
- **Responsive:** Desktop composition follows Figma; mobile stacks columns, preserves hierarchy, keeps touch targets usable.  
- **Assets:** Prefer exported Figma images for resume mock / logos where licensing allows community reuse; origin image is a clear placeholder (path TBD, e.g. existing `public/images/` or a neutral illustration).

---

## Copy principles

- Brand: **Resumegen** everywhere (never ResumeLM).  
- Promise: free forever — no credit card, no plan tiers, no watermark.  
- Features must map to real product capabilities (build, templates, PDF/DOCX, share links with optional password/email gate, AI assist when enabled, job tools as secondary if mentioned carefully).  
- Do **not** invent open-source, self-host, or BYO API-key positioning.  
- FAQ answers must not contradict CLAUDE.md product facts (especially “billing — there is none”; AI may still have a monthly cost-control cap).

---

## Component & file plan

### Compose

- `resources/js/Pages/Welcome.tsx` — page shell: `Head`, skip link, sticky nav, section composition, footer; auth-aware CTAs.

### New (or split) marketing sections

Suggested under `resources/js/Components/marketing/`:

| Component | Responsibility |
|---|---|
| `MarketingNav.tsx` | Sticky nav + anchors + auth CTAs |
| `MarketingHero.tsx` | Hero copy + CTAs + preview mock |
| `MarketingLogoStrip.tsx` | Trust / logo row |
| `MarketingFeatures.tsx` | Feature storytelling block |
| `MarketingHowItWorks.tsx` | Numbered steps |
| `MarketingOrigin.tsx` | Product-origin story + placeholder media |
| `MarketingFaq.tsx` | Accordion FAQ |
| `MarketingFinalCta.tsx` | Closing CTA band |
| `MarketingFooter.tsx` | Footer |

Shared helpers (CTA class names, section heading chip) may live in a small `marketing-ui.ts` / colocated util if duplication appears — no premature abstraction.

### Data

- **Static content in TS/TSX** (copy arrays for FAQ, features, steps). No new DB tables, no CMS.  
- No new backend routes required for v1.  
- Optional later: move copy to a JSON/PHP prop if editors need it — **not** in this pass.

### Dependencies / constraints

- Stay on React 19 + Inertia v3 + Tailwind v3 + existing UI primitives (Headless UI / daisyUI patterns already in the app).  
- Activate `inertia-react-development` and relevant UI skills at implementation time.  
- Do not reintroduce billing UI while adapting the Figma pricing section away.

---

## Testing & verification

### Automated

- Extend or add a feature test that `/` returns 200 and Inertia renders `Welcome`.  
- Assert key guest CTA targets (`register` / `login`) appear in the response where practical.  
- If FAQ is interactive client-side only, keep server assertions to structure/copy presence; use a minimal frontend test only if the project already patterns that for Welcome.

### Manual / browser (required before done)

- Guest: full scroll, all anchors, accordion open/close, primary CTA → register.  
- Logged-in: primary CTA → dashboard.  
- Desktop and mobile viewports.  
- Compare major sections against Figma screenshots for hierarchy (not pixel-perfect scoring).  
- Confirm **no** pricing cards or upgrade language shipped.

---

## Implementation notes (for the plan phase)

1. Inventory current `Welcome.tsx` sections and reuse what still fits (BrandMark, CTA helpers, token classes).  
2. Pull per-section design context / screenshots from Figma nodes while building each component.  
3. Rewrite all ResumeLM copy before visual polish so product truth isn’t painted on late.  
4. Delete pricing from the IA — do not build then hide.  
5. Browser-verify end-to-end per project UI verification rules.

---

## Non-goals

- Duplicating the community Figma into an editable Resumegen Figma file (readable source is enough for this pass).  
- Redesigning authenticated app chrome to match the marketing page.  
- Adding analytics events beyond what Welcome already has (unless already present).  
- Implementing iOS companion work (separate track).

---

## Open items (explicit)

1. **Origin photo** — placeholder path until a real image is provided.  
2. **Logo strip marks** — use Figma exports vs simplified text labels if asset reuse is unclear.  
3. **Support/contact footer link** — point at whatever Resumegen already uses (or omit if none).

These do not block writing the implementation plan; placeholders are acceptable for v1.
`}