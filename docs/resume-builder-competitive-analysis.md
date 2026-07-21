# Resume Builder Competitive & Pricing Analysis — Resumegen

> **Historical, 2026-07-21.** Billing and AI were removed from the app on this date, along with all
> pricing instrumentation and the prepaid proposal. Nothing here is live guidance — the pricing
> sections (especially Part 3's tier ladder) describe a monetization path that was abandoned. The
> app is free and unlimited, and has no AI features. Read the competitor research as research only.

**Rounds 1 + 2 complete.** 208 agents · ~8.9M tokens · 43 sources · 50 claims adversarially verified (36 confirmed, 14 refuted).
Market: US consumer self-serve. Constraint: free tier stays generous — no download gating, no watermark, no resume cap.
All pricing as displayed **2026-07-19, US vantage point**. Several vendors geo/A-B vary pricing. Re-verify before publication.

> **Evidence grading used throughout:** ✅ vendor primary source · ⚠️ secondary sources only · ❌ not established.
> Part 3 (the tier ladder) is explicitly **judgment**, not research output. Its evidentiary basis is stated inline.

---

## 1. Competitor matrix

| Vendor | Free download | Watermark | Paid entry | Annual floor | Grade |
|---|---|---|---|---|---|
| **Zety** | ❌ `.txt` only | n/a | $1.95/14d → **$25.95 / 4wks** | ~$71 (annual plan) | ⚠️ secondary |
| **Resume.io** | ❌ `.txt` only¹ | unknown | $2.95/7d → **$29.95 / 4wks** · $49.95/qtr | none | ✅ primary |
| **Resume Genius** | ❌ resumes `.txt` only² | n/a | $2.95/14d → **$23.95 / 4wks** | $95.40 | ✅ primary |
| **Enhancv** | ⚠️ branded, 7-day plan | Yes — branding | **❌ NOT ESTABLISHED** | — | free tier ✅ / price ❌ |
| **Rezi** | ⚠️ 3 PDF lifetime; DOCX unlimited | No | $29/mo · $149 lifetime | $348 | ✅ primary |
| **Jobscan** | ✅ Unlimited, unwatermarked | No | ~$49.95/mo · ~$89.95/qtr | ⚠️ **secondary only** | features ✅ / price ⚠️ |
| **Kickresume** | ✅ Unlimited | No | $24/mo → **$8/mo annual** | **$96** | ✅ primary |
| **Teal** | ✅ Unlimited PDF + DOCX | No | **$29/mo** · $13/wk · $79/qtr | none (no annual) | ✅ primary |
| **Reactive Resume** | ✅ Unlimited | No | $0 — MIT | $0 | ✅ primary |
| **Canva** | ❌ **NOT RESEARCHED** | — | — | — | ❌ |

¹ Internal contradiction: pricing page says "Downloads only in TXT format"; help article 3785088 says free users get one PDF in the *Vancouver* template only. The partial-gating reading was voted down 0-3, yet three verifiers independently surfaced it. **Honest position: free PDF is gated, possibly to a single template.** Do not state flatly that free PDF is impossible.
² Resume Genius free users *can* download **cover letters** in PDF/Word. The TXT-only limit applies to resumes.

### Cohort split — the headline finding

| Gates download | Ungated |
|---|---|
| Zety, Resume.io, Resume Genius | **Teal, Kickresume, Jobscan, Reactive Resume** |
| *(+ Rezi PDF-only, Enhancv via 7-day clock)* | |

> **Ungated, unwatermarked, uncapped export is parity with four competitors — not differentiation. It cannot be the headline pitch.**

### Where the free-download vendors put their paywall instead

| Vendor | Free | Paid boundary |
|---|---|---|
| **Teal** | Unlimited resumes, tracking, export, 10 templates, ~5–10 AI credits, no card | Match-score %, unlimited AI rewrites, cover letters |
| **Kickresume** | Unlimited resumes + downloads, 4 templates, 2 fonts | 40+ templates, AI Writer, ATS checker, Career Map |
| **Jobscan** | Unlimited builder + download, free job tracker, **5 scans/mo** | Unlimited scans, AI Optimize, summary/bullet generators, cover letters, LinkedIn optimizer |
| **Reactive Resume** | Everything | Nothing — BYO API key |

**They did not abandon monetization. They moved it to AI volume, scoring, and templates** — exactly where an AI-quota ladder would sit.

### Jobscan detail (the ATS specialist)
- **Free: 5 scans/month**, permanent, no card. Refresh on signup anniversary; unused scans roll over, cap 5.
- **Match rate** = % over five disclosed priorities: hard skills → education level (only when JD names an advanced degree) → job title → soft skills → other keywords. Hard skills weighted heaviest. Recommends 75% floor / 80% target. Word count and measurable results explicitly excluded.
- **Taxonomy is disclosed; weights and algorithm are not.** This is vendor self-description of a proprietary scorer with **no external validation**. It is adequate evidence for "what Jobscan says it measures" — it is **not** evidence that ATS optimization increases interviews, and must never be restated as such.
- Full suite: AI Resume Builder, ATS Resume Builder, Cover Letter Generator, Job Tracker, LinkedIn Optimizer, Auto Apply (shipped ~2026-06-10). *Marketed surface area only — says nothing about depth parity.*

---

## 2. Position assessment

### Parity (verified — not a lead)
Ungated export · ATS keyword analysis · interview coach · cover letters · resume import · multi-template PDF · job tracking.
Teal ships free job tracking. Rezi ships AI interview prep + a 23-metric score. Kickresume and Jobscan both ship ATS checkers.

### Possible leads — **all unverified**
No competitor was found shipping these, but **absence of evidence here is mostly absence of research**:

| Feature | Status |
|---|---|
| Password-protected / expiring share links | ❌ nobody checked |
| Share-link **unique-visitor** analytics | ⚠️ Resume.io ships *some* analytics ("Limited resume sharing and analytics"); depth unknown. 10 other vendors unchecked. VisualCV + Standard Resume — the likeliest holders — never reached. |
| Recruiter Q&A thread on a shared resume | ❌ nobody checked |
| A/B resume variants | ❌ zero coverage, either direction |
| Job-posting import from arbitrary URL | ❌ not checked |
| "Coach me" bullet mode | ❌ not checked |

> **This is the single largest risk in the pricing proposal below.** Three of the four proposed Pro-tier levers sit in this table.

### Structural cost asymmetry
Reactive Resume can be free forever because its AI marginal cost is **zero** (user supplies the API key; Ollama enables local models). Resumegen absorbs real inference COGS. ~~**This — not competitive positioning — is the argument for AI-volume metering.**~~
> **Invalidated 2026-07-20.** Costed from `config/ai.php`: a `gpt-4o-mini` call is ~$0.0005, so the
> 150/month cap costs ~8¢ per user per month. That is not a structural asymmetry, it is a rounding
> error. Metering is a **pricing** decision, not cost recovery. See `docs/prepaid-pricing-model.md` §3.

### Conversion benchmarks
ChartMogul + ProductLed + Growth Unhinged, Jan 2026, n=200 self-serve products. Free→paid within six months.

| Model | Good (p50) | Great (p75) |
|---|---|---|
| **Freemium, regular signup** | **3–5%** | **8–12%** |
| Free trial, no card | 4–6% | 10–15% |
| Free trial, card required | 25–35% | 50–60% |

1. The widely-quoted **8% median pools trials and freemium** — misusing it as the bar. The report itself notes *"very few products actually have an 8% conversion rate"*: 10x quintile spread, 25% of products below 2.5%.
2. **Sample is B2B.** Resumegen is B2C, episodic, no seat expansion. Transfer as "the SaaS benchmark," not "your expected rate."
3. The 25–35% card figure measures a **filtered population** — card-gating suppresses signups. Not evidence that gating wins in absolute terms.

> The ~6x gap is the structural revenue cost of staying generous. It is real, and it is the price of not being Zety.

---

## 3. Proposed tiers — **WITHDRAWN 2026-07-20**

> **This section is superseded by `docs/prepaid-pricing-model.md` and is kept only as a record of
> the reasoning that was rejected.** The subscription ladder assumed recurring use; the app's usage
> is episodic (a user leaves when they get hired), so a monthly fee misprices every user in both
> directions. Do not implement anything below.
>
> Original framing: grounded in verified price points, cohort structure, conversion bands, and COGS
> logic; feature allocation rested partly on the unverified table above, with §3.4 to read first.

### 3.1 The strategic problem

Verified price ladder shows convergence at **$29/mo** (Teal, Rezi, Resume.io) with a floor at **$8/mo annual** (Kickresume). An AI-volume ladder lands you *matched on features by Teal and undercut on price by Kickresume* — the worst square on the board.

**So the ladder is anchored elsewhere.** Every competitor optimizes the *build-and-send* half of job hunting. Nobody verified as owning the *after you sent it* half. That's the wager.

### 3.2 The ladder

| | **Free** | **Pro** | **Campaign** |
|---|---|---|---|
| **Monthly** | $0 | **$9** | **$19** |
| **Annual** | $0 | **$72** ($6/mo) | **$156** ($13/mo) |
| Resumes / cover letters | Unlimited | Unlimited | Unlimited |
| **PDF + DOCX export** | **Unlimited, unwatermarked** | ✓ | ✓ |
| All templates | ✓ | ✓ | ✓ |
| Job search + saved searches | ✓ | ✓ | ✓ |
| Share links | ✓ + total view count | + unique visitors, per-visit rows, 7-day trend | + referrer, time-on-page |
| **Password / expiry on links** | — | ✓ | ✓ |
| **Recruiter Q&A thread** | — | ✓ | ✓ |
| **A/B variants** | — | 2 per resume | Unlimited |
| AI actions / month | **25** | 300 | 1,500 |
| Job fit scoring | Manual, per page | ✓ | ✓ |
| Daily job alerts | 1 search | 5 searches | Unlimited |
| Resume strength scoring | Basic | Full | Full |
| Interview coach | 2 sessions | Unlimited | Unlimited |
| AI model tier | Fast | Fast | **Frontier** |

### 3.3 Rationale per boundary

**Free stays genuinely generous.** Export ungated and unwatermarked, unlimited resumes, all templates, full job search. This is *parity* with Teal/Kickresume/Jobscan — the entry ticket, not the pitch. **25 AI actions/mo is still 3–5x Teal's free allocation** (~5–10 credits).

**The Free→Pro boundary is deliberately not AI.** It's *"who looked at my resume, and can they ask me something."* Competing on AI volume means fighting Teal at $29 with Kickresume undercutting at $8. Share analytics + recruiter Q&A is the one axis with no verified competitor.

**$9/mo is chosen to sit below Kickresume's $8/mo annual floor at $6/mo annual** while being ~⅓ of Teal. Cheap enough to be an impulse during a job search; the annual discount (33%) is aggressive because job searches are episodic — you want the year committed before they find a job and churn.

**$19 Campaign targets the active searcher**, still below every $29 competitor. Frontier-model access is the honest premium: it costs materially more per call, so it should cost more.

### 3.4 Risks — read before committing

**1. The differentiation may not exist.** Three of four Pro levers (share analytics depth, recruiter Q&A, A/B variants) were **never verified as absent** from competitors. Resume.io already ships *some* share analytics. VisualCV and Standard Resume were never checked and are the likeliest holders.
→ **Action: manually open VisualCV, Standard Resume, and Resume.io's paid share features before writing a line of billing code.** ~30 minutes. If any ships view analytics with recruiter messaging, this ladder's anchor is gone and Pro needs re-basing.

**2. The free tier burns real money.** 25 AI actions × 10,000 free users = 250k requests/month of pure COGS against non-payers. At 4% conversion that's 400 payers × $9 = **$3,600 MRR** funding all of it. Model the burn at your actual per-call cost before setting 25 — it may need to be 10.
→ This is why the free AI number, not the price, is the decision that determines whether the model works.

**3. Cutting free AI from 150 → 25 is a takeaway from existing users.** Every current account has 150/mo. Anything below that is a downgrade someone will notice and post about.
→ **Grandfather existing accounts at 150.** The cost is bounded (existing users only), the goodwill is not.

**4. Episodic churn.** Job searches last 2–4 months. Expect high voluntary churn regardless of quality — this is why annual pricing is discounted hard, and why LTV assumptions from B2B SaaS benchmarks will overstate reality.

**5. Two competitors give it all away.** Jobscan monetizes scans while giving away the builder; Reactive Resume is free forever at zero AI COGS. Neither can be beaten on price — only on the post-send workflow.

### 3.5 Against the verified ladders

| | Free download | Entry | Mid | Top | Annual floor |
|---|---|---|---|---|---|
| **Resumegen (proposed)** | ✅ | **$9/mo** | — | $19/mo | **$72/yr** |
| Kickresume | ✅ | $8/mo annual | $18/mo qtr | $24/mo | $96/yr |
| Teal | ✅ | $13/wk | $79/qtr | $29/mo | none |
| Rezi | ⚠️ PDF-capped | $29/mo | — | $149 lifetime | none |
| Jobscan | ✅ | ⚠️ ~$49.95/mo | ⚠️ ~$89.95/qtr | — | ⚠️ unknown |
| Resume.io | ❌ | $2.95/7d → $29.95/4wks | $49.95/qtr | — | none |
| Zety | ❌ | $1.95/14d → $25.95/4wks | — | — | ~$71/yr |

**Position: cheapest credible paid tier in the set, with the most generous free tier among vendors that charge at all.**

---

## 4. What is still not established

| Gap | Why it wasn't closed |
|---|---|
| **Jobscan's price ladder** | `jobscan.co/pricing` 301s to a JS-only app shell; `support.jobscan.co` returns 403. Needs headless render or archive snapshot. |
| **Enhancv Pro price** | Pricing page renders `NaN`. $16.50 vs $29 conflict untouched. |
| **Canva** | Zero coverage, both rounds. |
| **Share-link analytics sweep** | Only Resume.io produced a datapoint. 10 vendors unchecked. WebSearch budget exhausted 200/200. |
| **A/B variants** | Zero evidence either direction. |
| **Resume.io watermarking / DOCX** | No source mentions either. |

### Corrections applied
- **Round 1's refutation of Resume.io's $2.95/$29.95 figures was itself wrong.** Round 2 reproduced them verbatim from the vendor's own pricing page. Verdict reversed. Most plausible cause of the original disagreement: resume.io geo/A-B varies pricing.
- Round 1's "Jobscan is the ATS point-tool that likely owns ATS scoring" framing was **wrong in the other direction** — Jobscan is a full suite *and* an ungated-download vendor.

### Known-bad figures (refuted — do not reuse)
From `bestjobsearchapps.com`, `firstpagesage.com`, `kickresume.com/help-center`:
Zety $2.70→$23.70 · Kickresume $9/wk, $29/mo, $179/yr · Enhancv $19/mo, $60/yr, $149 lifetime · Enhancv Pro $24.99/$16.66/$13.33 · freemium converts 3.7% · opt-out trials 49.9% · card trials ~30% / 5x no-card.

### Method limits
All fetches ran through WebFetch's markdown-summarizing path, not raw HTML — exact pricing strings should be re-confirmed against page source before publication. Round 1 surfaced one **fabricated quote fragment** (Reactive Resume AI); citation repointed to `docs.rxresu.me`. Jobscan feature findings rest almost entirely on vendor marketing pages — authoritative for what the product contains and restricts, not for efficacy.

---

## 5. Recommended next actions

1. **30 minutes of manual checking** — VisualCV, Standard Resume, Resume.io paid sharing. This decides whether §3's anchor holds.
2. **Model the free-tier AI burn** at actual per-call cost. That number, not the price, determines viability.
3. **Do not write billing code yet.** `CLAUDE.md` forbids adding a paywall without explicit approval, and several tests assert `assertSessionMissing('featureGate')` specifically to catch one creeping back in. This document is a proposal.
