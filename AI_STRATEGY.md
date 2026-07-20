# AI Strategy — Decision Record

Decided and implemented 2026-07-13. Revised 2026-07-20 after the 2026-07-14 billing
removal invalidated this document's economics, and after the growth model produced real
per-call costs.

**Status: implemented.** This is a record of decisions already executed, not a proposal.
Nothing here is pending.

## Current AI surface

All routes sit behind the `ai_enabled` middleware and `throttle:20,1` (`routes/web.php`).

| Feature | Route |
|---|---|
| Rewrite bullet | `POST /builder/{r}/ai/rewrite-bullet` |
| Critique bullet ("Coach me") | `POST /builder/{r}/ai/critique-bullet` |
| Generate summary | `POST /builder/{r}/ai/summary` |
| ATS keywords | `POST /builder/{r}/ai/ats-keywords` |
| Interview coach | `POST /builder/{r}/interview-coach` |
| Cover letter draft | `POST /cover-letters/{letter}/ai/draft` |

`AI_ENABLED` defaults to **true** (`config/ai.php`). The middleware 404s rather than 403s,
so a suspended feature looks absent rather than plan-gated.

Deterministic and correctly NOT AI: strength score, salary hint, autocomplete, heatmap.

## Deleted — do not revive without asking

Translate, career map, resignation letters, career coach chat, proofreading. Each was
removed deliberately:

- **Translate** — needs domain nuance the model quietly botches; highest cost per call
  (full resume in and out); nobody buys the product for it.
- **Career map** — vague, unverifiable output. The "AI horoscope": great demo, zero repeat use.
- **Resignation letters** — a four-line letter. A template with three blanks does it better,
  instantly, for $0.
- **Career coach chat** — unbounded tokens, unbounded scope; users will ask it about visa law.
- **Proofreading** — was deterministic anyway.

## How competitors get AI wrong

1. **The chat box as a feature.** Nobody wants to converse with their resume builder; they
   want a button that fixes the bullet they are staring at.
2. **AI where code answers** (Rule 5). Competitors run "ATS score" through an LLM and get a
   non-deterministic number that changes on refresh. Ours (`StrengthScoreController`) is
   deterministic. **Do not "upgrade" it to AI.**
3. **One-shot "generate my whole resume."** Produces a generic resume that gets rejected, and
   the user cannot tell which part is the lie.
4. **Quota theatre.** Metering so aggressively that users never experience the value.
5. **No provenance.** Users cannot tell what AI wrote, and submit hallucinated metrics
   ("increased revenue 40%") they cannot defend in an interview. The real liability here.

## The thesis

The two founding concerns — "I want users to use their own brains" and "recruiters are tired
of AI-generated content" — are one concern. If recruiters can spot AI-generated resumes and
are rejecting them, **a resume builder whose AI generates the resume is actively harming its
users.** That is a product defect, not a philosophical qualm.

**The move: flip the direction of the AI. Stop pointing it at the page; point it at the person.**

| Instead of AI that... | Build AI that... |
|---|---|
| Writes your bullet | Asks "what was the result?" and makes *you* answer |
| Generates your summary | Tells you your summary says nothing specific |
| Produces polished prose | Flags that your bullet has no number in it |
| Fills the blank | Interrogates the blank |

User writes *"Responsible for managing the sales team."* Generation rewrites it into confident
filler. Critique returns: *"How many people? Over what period? Did revenue move — by how
much?"* The user types the real answer. The resume is now in their voice, contains facts only
they know, and reads like nothing else in the stack — **because it is true.**

Cheaper (short critique beats long generated prose), more authentic, and defensible against
recruiter fatigue in a way better prompts never will be.

**Implemented as a true 50/50.** "🎯 Coach me" and "✨ Write it for me" sit side by side with
no nudge either way (`ResumeBuilder/Edit.tsx`). The recommendation was coach-primary — an easy
button next to a hard button gets pressed every time — and the 50/50 was chosen knowingly.
**If the coach sees little use, this is the first thing to revisit.**

## Cost

**Vendor choice is not the cost lever, and cost is not the problem.** Measured against the
growth model's fabricated traffic: ~0.32 cents per tailored job across 3–9 calls, against a
proposed 50c price — a 99% margin. Total modelled AI spend across ~3,400 jobs was $11, versus
a $480/yr infra floor. Sensitivity analysis ranks AI cost **dead last** of eight assumptions,
swinging the twelve-month result by $11 while activation rate swings $659.

Current setup: `gpt-4o-mini` via `openai-php/laravel`, configured in `config/ai.php`. An
Anthropic branch exists in `AiService` and is exercised by `AiProviderTest`, but is unused.
Per-model pricing lives in `config('ai.pricing')`, denominated in cents per 1,000 tokens.

**Metering is a flat monthly cap for every account** (`AI_MONTHLY_LIMIT`, default 150) — a
cost control, not a plan gate. There are no tiers. Any earlier version of this document
comparing per-user AI cost against "$9 subscription revenue" described a billing system
deleted on 2026-07-14.

For economics, see `docs/prepaid-pricing-model.md` (proposal, nothing billed) and
`docs/growth-model-sample-run.md` (fabricated scenario sweep).

## Known gap

Historical cost data before 2026-07-20 is all zero and unrecoverable — `estimateCostCents()`
rounded every `gpt-4o-mini` call (~0.05c) to 0 before storage. Fixed by migrating to
micro-cents; see the AI section of `CLAUDE.md`. The precision was lost at write time, so no
backfill is possible.
