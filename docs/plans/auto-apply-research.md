# Auto-apply research and status

Parked 2026-08-13. User is thinking; **do not implement** until they reopen this and finish the open questions below.

Resume this by reading this file, then `PLAN.md` Phase 2 (Apply extension) and the existing job kanban (`JobApplication`).

---

## Status

- **Session:** competitive research + product design talk only. No code, no spec, no implementation.
- **User direction so far:** wants modes **A, B, and C**, plus a **receipt that the apply actually landed**.
- **Blocked on:** user thinking. Next design question (unanswered): first-wave destinations for Autopilot (C). See Open questions.
- **Existing code this would sit on:**
  - Apply extension (Phase 2): empty-only fill, **no auto-submit** (deliberate).
  - `/jobs` search (Adzuna / USAJOBS) + URL import.
  - Job kanban: `JobApplication` has `status`, `applied_at`, `job_url` — user-set, **not proof**.

---

## What the market actually does

Classic resume builders (Kickresume, Rezi, Zety, Novoresume, Enhancv, Resume.io) **do not** auto-submit applications. Kickresume “Autopilot” is pre-written resume phrases, not apply.

Two other categories do:

| Category | Behavior | Examples | Source (check if stale) |
|---|---|---|---|
| Job-search companions | Fill forms; **user clicks Submit** | Teal, Huntr Autofill, Simplify Copilot | [tealhq.com](https://www.tealhq.com/), [huntr.co/product/job-application-autofill](https://huntr.co/product/job-application-autofill), [simplify.jobs/copilot](https://simplify.jobs/copilot) |
| Review-then-send | Draft + queue; nothing sends until user approves | Jobscan Auto Apply | [jobscan.co/auto-apply](https://www.jobscan.co/auto-apply) — credits ~$1.40–$1.70; Premium 2 credits/month |
| Unattended mass apply | Apply from filters while user is idle | LoopCV, AIApply, JobCopilot, LazyApply, FastApply | [loopcv.pro](https://www.loopcv.pro/), [aiapply.co/auto-apply](https://aiapply.co/auto-apply), [jobcopilot.com](https://jobcopilot.com/), [lazyapply.com](https://lazyapply.com/) |

Simplify is the closest “respectable” analog to current Resumegen Apply: fill Workday / Greenhouse / Lever / Taleo / iCIMS; independent reviews say it **stops on the last page** so the user submits. That is a product choice, not a missing feature.

LazyApply-class tools are where “Applied” is often a lie (silent LinkedIn drop) and LinkedIn account restriction is a reported risk.

**LinkedIn (external — re-check):** [Prohibited software and extensions](https://www.linkedin.com/help/linkedin/answer/a1341387) says LinkedIn does not permit third-party bots, crawlers, or extensions that scrape, change the page, or automate activity.

This was a product-page + policy scan, not a full 12-dimension teardown (no 20-review / jobs / SEO pack per competitor).

---

## Product shape agreed in conversation (not locked)

One product, three **modes**, one **receipt ledger**. Ship in this order:

| Mode | Who submits | Notes |
|---|---|---|
| **A — Assist** | User clicks Submit | What Apply is today, plus success detection |
| **B — Approve** | We submit after a review queue | Jobscan shape |
| **C — Autopilot** | We submit from filters, no per-job click | Only after A/B receipts work |

Do **not** ship C without a working A/B receipt. That is the LazyApply failure mode.

Agent recommendation (user has **not** accepted a site list yet):

- A may **fill** LinkedIn; user submits.
- B/C start on **allowlisted company ATS** (Greenhouse, Lever, Ashby; Workday later), not LinkedIn Easy Apply / Indeed.
- C on LinkedIn/Indeed fights those sites’ rules and makes honest confirmation nearly impossible.

There is no official candidate “submit this resume to Indeed / LinkedIn / Workday” API. Implementations are:

1. **Extension on the user’s logged-in browser** (current Apply) — best identity, no stored passwords.
2. **Review queue then submit** via extension or a tiny public-ATS POST allowlist.
3. **Headless farm + stored credentials** — different company (vault, CAPTCHA, bans, refunds). Agent recommended **not** building this for Resumegen.

Repo already refuses HTML scrapers for the big boards (`CLAUDE.md` Job Search). A submit-bot is that problem plus a click.

---

## Confirmation (“did it work?”)

User requirement: the user must know whether the apply landed.

No board gives a third-party a reliable “this candidate applied” API. Confirmation is inferred. Do **not** treat “we clicked Submit” as Applied.

Proposed confidence ladder (design talk only):

1. **Page proof** — thank-you URL / “application received” / confirmation number. Store screenshot + text. Status: `Submitted (page proof)`.
2. **HTTP proof** — `201` + ATS application id on a documented public apply form (Greenhouse/Lever board apply). Not available for LinkedIn Easy Apply / Indeed.
3. **Email proof** — optional Gmail/Outlook watch for “we received your application.” Catches silent drops.
4. **Unconfirmed** — click fired, no thank-you, no ATS id, no email in 24h. Show `Submitted — unconfirmed`. User can confirm manually.

Statuses sketched for the existing kanban:

`Queued → Filling → Needs review (B) → Submitting → Submitted (unconfirmed) → Confirmed → Failed`

Each row: mode (A/B/C), site, resume version, timestamp, proof type, screenshot or ATS id, error. Notify on **Confirmed** or **Failed**, not on “we think we clicked.”

Not proof: extension click event; scraped LinkedIn/Indeed “Applied”; HTTP 200 on the posting page.

---

## Decisions a future session must not reverse silently

- Phase 2 Apply is **empty-only fill, no auto-submit** until this work is explicitly un-parked.
- Do not reintroduce share-link management in the builder.
- Do not add a paywall / billing without asking (`CLAUDE.md`). Jobscan-style credits were mentioned as a possible later fit for B/C, not approved.
- Do not scrape LinkedIn/Indeed with a server HTTP client.
- Cover letters / gap analysis stay out of Job Imports unless the user reopens that (`CLAUDE.md` Removed Features).

---

## Open questions (ask in this order)

1. **C first-wave destinations** (asked, unanswered):
   1. Greenhouse / Lever / Ashby career pages only (recommended)
   2. Those plus Indeed / ZipRecruiter-style boards
   3. Include LinkedIn Easy Apply from day one (push back)
   4. Only jobs already in Resumegen (`/jobs` + URL imports)
2. Where C **runs**: user’s Chrome vs Resumegen servers vs a local helper.
3. Whether B/C may **store site credentials / session cookies**.
4. Rate / volume caps (Jobscan: a few matched roles/day vs LoopCV: hundreds).
5. Email-inbox connect for confirmation — in v1 or later.
6. Whether “A+B+C” is one spec or three phased specs (agent: three phases, one ledger).

---

## Next step when the user returns

1. Ask question 1 (C destinations) if still unanswered.
2. Finish remaining questions one at a time (brainstorming skill).
3. Propose approaches + a written spec only after they approve the design.
4. Spec path if/when written: `docs/superpowers/specs/YYYY-MM-DD-auto-apply-design.md`.
5. Implement **A + receipt ledger** first, then B, then C. Do not start C in the same pass.

Kickoff prompt:

> Read `docs/plans/auto-apply-research.md` and `PLAN.md` Phase 2. User parked auto-apply after research. Continue from Open questions. Do not write code until destinations and remaining questions are answered and a spec is approved.

---

## What this session built

Nothing in `app/`, `extension/`, or tests. This file + a pointer in `PLAN.md` only.
