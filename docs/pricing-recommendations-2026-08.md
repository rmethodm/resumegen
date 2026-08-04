# Pricing recommendations — Resumegen (2026-08)

> Advisory only. The app is free and unlimited; billing is not live.
> Grounded in `docs/resume-builder-competitive-analysis.md` (historical scan, 2026-07)
> and the product surface as of 2026-08 (post AI / cover letter / job search / portfolio removals).

---

## What the competitive scan still gets right

| Finding | Still true? |
|---|---|
| Market converges ~**$24–30/mo** (Resume.io, Teal, Rezi) or **~$8/mo annual** (Kickresume) | Yes as market anchors |
| Ungated PDF/DOCX is **parity**, not a premium | Yes — already shipped |
| Job search is **episodic** (≈2–4 months) → monthly SaaS misprices both ways | Yes — stronger now that recurring AI is gone |
| Freemium free→paid often **3–5%** (B2C often worse than B2B SaaS benchmarks) | Planning range, not a promise |
| Free-download vendors monetize **AI volume, templates, scoring** — not export | Only half applies: no AI to meter |

What the old ladder ($9 Pro / $19 Campaign) depended on is mostly **gone**: AI quotas, cover letters, job alerts, A/B variants, interview coach, frontier models. The scan’s **post-send** idea (share analytics, password/expiry links) is more relevant now — and password, expiry, email gate, and download control on share links already ship.

---

## What you’d actually be selling today

**Shippable product (honest inventory):**

- Unlimited resumes / versions / compare
- ~24 layout-distinct templates + PDF/DOCX
- Workstation editor + starter profile
- Deterministic strength score
- Token share links (password, expiry, email, download gate)
- No AI, no cover letters, no job tracker, no ATS match scanner

Against Teal / Kickresume / Jobscan free tiers, that is a **strong free product**, not a clear **$29/mo** product. Charging Zety/Resume.io prices without download gating *or* AI is a hard sell.

Price points should either:

1. **Stay cheap and honest** about a thin paid layer, or
2. **Wait** until paid value exists, then use market anchors.

---

## Recommended price points (if billing returns)

### Principle

**Do not gate export or watermark.** That puts you with Zety/Resume.io — conversion-heavy, trust-destroying, and opposite the scan’s free-tier strategy. Gate things that feel like “power tools after the resume is written.”

### Option A — Single paid tier (recommended for *current* product)

| | Free | Paid |
|---|---|---|
| **Price** | $0 | **$9/mo** or **$49–59 one-time “search pack”** (90 days) |
| **Annual** | — | **$59–72/yr** (~$5–6/mo) if subscription is required |

**Why $9 / ~$60 yr / ~$50 pack**

- Under Kickresume’s ~$8 annual floor on monthly sticker; well under Teal $29 / Resume.io ~$30
- Impulse buy during a job search (scan’s rationale for $9)
- Fits episodic use better than $19–29 if paid features are thin
- One-time pack answers the scan’s best critique of subscriptions: people leave when hired

**Free keeps (parity ticket):** unlimited resumes, all (or almost all) templates, unwatermarked PDF/DOCX, basic share link.

**Paid can charge for *with today’s code* (honest gates):**

| Lever | Notes |
|---|---|
| Password + expiry + email-gated share | Already built; was Pro in the old ladder |
| Share view history / unique visitors | Partial/missing UI — real paid surface if finished |
| Version compare + snapshot history depth | Versions exist; depth/history limits are a soft gate |
| DOCX *or* “all templates” | Only if free keeps PDF + a template subset — Kickresume-style |

Avoid: resume caps as the main pitch (punitive vs Teal free unlimited). Avoid: AI limits until AI exists again.

### Option B — Two tiers (only after rebuilding paid surface)

Use when there is again **clear mid/high value** (ATS scans, AI rewrites, cover letters, or job CRM):

| | Free | Pro | Campaign / Search |
|---|---|---|---|
| **Monthly** | $0 | **$9** | **$19** |
| **Annual** | — | **$72** ($6/mo) | **$156** ($13/mo) |
| **Or pack** | — | **$29 / 30 days** | **$49 / 90 days** |

That is the scan’s **withdrawn** ladder — still the right *shape* vs competitors, but only if Pro/Campaign features are real. Today, $19 has almost nothing exclusive to hang on.

### Option C — Don’t price the builder; price a point tool (Jobscan path)

If the long-term wedge is **job-match / ATS scanning**:

| | Free | Paid |
|---|---|---|
| Builder + export | Unlimited | Unlimited |
| Scans | **3–5 / mo** | **Unlimited** or high cap |
| **Price** | $0 | **$19–29/mo** or **~$79/qtr** |

Higher prices become defensible because the market already pays Jobscan ~$50/mo for scans. Do not use these prices for “templates + share link” alone.

---

## What not to do right now

| Price | Why not |
|---|---|
| **$1.95 / 7–14d trial → $25–30 / 4 weeks** | Download-gated dark pattern; fights free-export positioning |
| **$29/mo** as sole paid tier | Market price for Teal/Rezi-class AI + suite; current surface is thinner |
| **$49 Agency** | Orgs/agency removed; no seats product |
| **Metering AI at free=25** | No AI COGS; only relevant if AI returns |
| **Gating PDF/DOCX or watermarking free** | Expensive trust hit; free-download cohort is the natural peer set |

---

## Pack vs subscription

The scan’s strongest economic insight still holds: usage is episodic. Monthly fees overcharge short searches and undercharge long ones.

| Model | Fit for Resumegen |
|---|---|
| **Subscription $9/mo + hard annual discount** | Simple, Stripe-native; expect high voluntary churn |
| **Search pack $49 for 90 days** (or $29/30d) | Best match to job-search lifecycle |
| **Lifetime $79–149** | Only if product is complete and sticky — risky before that |

**If monetizing before rebuilding AI/ATS:** lead with **$9/mo or $49–59 / 90-day pack**, not $19–29.  
**If monetizing after a real paid wedge:** step up to **$9 / $19** or Jobscan-like scan pricing.

---

## Competitor anchors (from scan; re-verify before publishing)

| Competitor | Free export | Paid entry (approx.) |
|---|---|---|
| Kickresume | Yes | ~$8/mo annual · ~$24/mo monthly |
| Teal | Yes | $29/mo · $13/wk · $79/qtr |
| Rezi | Partial PDF | $29/mo · $149 lifetime |
| Resume.io / Zety / Genius | No (effectively) | Trial → ~$24–30 / 4 weeks |
| Jobscan | Yes (builder) | ~$50/mo for scans |
| Reactive Resume | Yes | $0 |

**Position if charging now:** cheapest *credible* paid tier among vendors that charge, with free export — Kickresume-undercut on price, Teal-like free generosity, without claiming Teal’s AI depth.

---

## Practical takeaway

| If… | Price points |
|---|---|
| **Ship paid on today’s product** | **Free** + **$9/mo** *or* **$49–59 / 90-day pack**; annual **~$60–72** if needed |
| **Ship paid after share analytics + 1–2 power features** | Same entry, optional **$19** “active search” tier |
| **Bring back AI / ATS scans as the wedge** | Keep free export; meter scans/AI; **$19–29/mo** becomes defensible |
| **Nothing paid-ready yet** | Stay free; don’t invent gates just to justify a number |

**Do not** reintroduce the old Free / Starter($9) / Pro($19) / Agency($49) ladder as-is — Agency and most Pro levers don’t exist, and Starter was already “dead weight” in the 2026-06 repricing design notes.

---

## Related docs

- `docs/ai-reintroduction-map.md` — where AI should live; Free vs Paid matrix for Tier 1 AI
- `docs/ai-provider-comparison-2026-08.md` — Claude vs OpenAI vs Grok cost/quality pick (2026-08)
- `docs/resume-builder-competitive-analysis.md` — competitor matrix and withdrawn tier ladder (historical)
- `docs/superpowers/specs/2026-06-13-repricing-design.md` — old 4-tier design (pre-removal)
- `docs/superpowers/specs/2026-07-05-kickresume-competitive-gap-analysis.md` — Kickresume gaps (many features since removed)

## Next steps (optional, not started)

1. ~~Map one Free vs Paid feature matrix to **today’s code only**~~ → see `docs/ai-reintroduction-map.md` (Tier 1 AI matrix; non-AI share gates still Option A above)
2. Sketch pack vs subscription economics with conversion bands from the scan
3. Before any billing code: explicit product approval (see CLAUDE.md — no paywall without asking)
