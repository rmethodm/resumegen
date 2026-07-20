# Prepaid Pricing Model — Resumegen

**Status: PROPOSAL. Nothing here is implemented, and §12 argues it should not be yet.**
`CLAUDE.md` forbids adding a paywall without explicit approval, and several tests assert
`assertSessionMissing('featureGate')` specifically to catch one creeping back in. Do not write
billing code against this document without a separate go-ahead.

**Read [§12 Preconditions](#12-preconditions--do-not-implement-before-these) before §13.** Every
number here is a reasoned guess with zero usage data behind it; §12 lists what must be measured
first and why the median user might never pay under the current grant size.

Decided 2026-07-20. Supersedes the subscription tier ladder in
[`resume-builder-competitive-analysis.md`](resume-builder-competitive-analysis.md) §3, which is
withdrawn — see "Why not subscriptions" below.

---

## 1. The model in one paragraph

Users hold a **balance in real dollars**. Everything in the app is free forever except AI work
targeted at a specific job. Targeting a job costs **$0.50, once per job, per user** — and buys
unlimited AI against that job forever, including every revision. Balances never expire. Refunds are
self-serve and unlimited. There is no subscription and no recurring charge of any kind.

## 2. Why not subscriptions

A job search is episodic — 2–4 months, then the user is done forever. A monthly fee is a
one-size-fits-all instrument applied to a population with wildly varying durations, billed to people
who are by definition income-constrained. The competitive analysis flagged this as risk #4 with no
proposed fix, because subscriptions have none.

Prepaid balances make churn structurally meaningless: nothing to cancel, no dunning, no failed-card
recovery, no chargeback from someone hired in week 3 who forgot to cancel. That last case is what
makes Zety's `$25.95/4wks` auto-renew a consumer-complaint magnet. **"We never charge you after you
stop using it" is a defensible brand position against the entire gated cohort** — and unlike the
withdrawn §3 ladder, it does not depend on any of that document's unverified differentiation claims.

## 3. Costs — why the unit price is not cost-recovery

Derived 2026-07-20 from `config/ai.php` pricing (verified correct against OpenAI's published
`gpt-4o-mini` rates) plus the 1000-token output cap in `AiService`. **`ai_requests` was empty**, so
these are modelled, not observed.

| Scenario | In / Out tokens | Cost per call |
|---|---|---|
| Typical (bullet rewrite, summary) | 1,500 / 400 | $0.0005 |
| Worst case at input cap | 2,000 / 1,000 | $0.0009 |
| Heavy (job-posting page import) | 15,000 / 1,000 | $0.0029 |

- The current `AI_MONTHLY_LIMIT` of 150 costs about **8 cents per user per month.**
- A $0.50 pairing consuming 50 calls costs about **2.5 cents.** Gross margin ≈ 95%.
- Even on `gpt-4o` (~16x mini), 150 calls is ~$1.16/user/month.

> **This invalidates §2's "structural cost asymmetry" argument** in the competitive analysis, which
> claimed absorbing inference COGS was *the* reason to meter AI. At these prices it effectively is
> not. Metering is a **pricing** decision, not cost recovery.
>
> **Never tell users that credits reflect our costs.** They do not. We price the outcome; the margin
> is a consequence, not a justification.

Related: `ai_requests.estimated_cost_cents` is an `integer`, so every `gpt-4o-mini` call rounds to
**0**. Cost logging currently records nothing and must be changed to decimal or micro-cents before
any of this is measurable.

## 4. Price the outcome, not the call

At $0.0005/call, "1 credit = 1 AI call" would be a ~100x markup dressed as usage-based pricing. Any
curious user does that arithmetic. Two consequences:

- **No credit abstraction.** Balances are dollars. A credit unit exists to obscure an exchange rate;
  that is its only function. `$7.50` and `Tailored for Senior PM at Acme — $0.50` need no
  explanation and no conversion table.
- **The unit is a job, not a call.** Users already count jobs ("I applied to 40 places"). Unlimited
  revisions inside a purchased unit is what removes metering anxiety — the user polishes until the
  output is actually good, because polishing is already paid for. Given the population is
  cash-constrained and job-searching, a meter that discourages use fails them at the exact moment
  the product should help.

**The unit is the job, not the resume×job pair.** Pairing on resume too would charge $1.00 to test
two resume variants against one job — billing users for the A/B variants feature. "$0.50 per job you
pursue" is also a shorter sentence.

## 5. What is free vs paid

| Free forever | Rationale |
|---|---|
| Unlimited resumes, editing, all templates | Parity with Teal / Kickresume / Jobscan — entry ticket, near-zero cost |
| PDF + DOCX export, unwatermarked | Standing product constraint |
| Share links, analytics, recruiter Q&A | Costs ~nothing; charging punishes success. **Never bill on share views** — links are public URLs, so a view charge lets anyone drain a stranger's balance by refreshing |
| Job search, saved searches, alerts | Deterministic code, no AI |
| Job ranking / "score against my resume" | Already opt-in and batched per page — keep free |
| **Resume import** | Activation. Charging before the user has seen value is the worst possible placement |
| **Job posting URL import** | Same, plus it is what *produces* the billing key — see §6 |
| **Interview coach** | Cheap, and the feature most likely to be someone's first "wow" |

**Paid trigger:** the first of `ats_keywords`, `rewrite_bullet`, `critique_bullet`,
`generate_summary`, or `cover_letter` fired against a known job.

**The `__general__` pairing.** `rewrite_bullet` can run with no job attached. Left free, a user does
all resume work for $0 and only pays when targeting a posting — which becomes the default path. So
non-job-specific AI is covered by one reserved pairing keyed `__general__`, costing $0.50 once,
ever. A $3 signup grant is therefore general polish plus five real jobs.

## 6. Job identity — the billing key

### The existing key cannot be reused

`JobSearchService::dedupe()` (line 68) builds
`mb_strtolower(trim($company.'|'.$title.'|'.$location))`. That runs over **one result set at one
moment**; a billing key must be stable across sources, sessions, and months. It breaks three ways:

- **`location` is the weak link.** Adzuna returns `New York, NY`; USAJobs returns
  `New York, New York`; `import_job_posting` is an LLM reading free text and may produce `NYC`,
  `New York, NY 10001`, or `Remote (US)`. Same job, three keys, three charges.
- **`company` varies** — `Acme Inc.` / `Acme, Inc.` / `Acme Incorporated`.
- **`trim()` applies to the concatenated string, not per field**, and internal whitespace is never
  collapsed.

`JobUrlImporter` uses `sha1($url)` as `external_id`, which is worse for billing — tracking params
and cross-board syndication both split it. The unique index on
`job_listings (job_search_id, source, external_id)` is scoped to one saved search, so it is not a
global identity either.

### The asymmetry that drives the design

| Error | Cost |
|---|---|
| Charge twice for one job | Trust damage, on the exact axis this pricing model is built to own |
| Miss a charge on two real jobs | $0.50 revenue + ~2.5¢ inference |

**Bias hard toward under-charging.** Getting billed twice because the normalizer saw `NYC` and
`New York, NY` is the story that undoes the entire brand position in §2.

### The key

`company|title`, location dropped, legal suffixes stripped.

```php
// ponytail: billing key is deliberately coarser than JobSearchService::dedupe() —
// it drops location. Over-merging costs $0.50; under-merging bills twice for one
// job, which is the error that actually hurts. Ceiling: "Sr." vs "Senior" still
// splits. Add title-abbreviation folding only if support tickets show it.
public static function billingKey(string $company, string $title): string
{
    $clean = function (string $s): string {
        $s = mb_strtolower($s);
        $s = preg_replace('/\b(inc|llc|ltd|corp|co|gmbh|plc)\b\.?/u', '', $s);
        $s = preg_replace('/[^\p{L}\p{N} ]+/u', '', $s);

        return trim(preg_replace('/\s+/u', ' ', $s) ?? '');
    };

    return $clean($company).'|'.$clean($title);
}
```

**Billing and search dedupe deliberately use different keys.** Search wants precision (do not hide
distinct listings); billing wants recall (do not double-charge). Do not let anyone "helpfully" unify
them later.

### Rules

1. **A company name is required before tailoring is available.** `job_listings.company` is nullable,
   and `null|title` would over-merge every unnamed-company job into a single pairing.
2. **Keys are stored at purchase time and never recomputed.** Improving the normalizer later would
   otherwise leave old rows unmatched and charge someone twice. Corollary: only ever make the
   normalizer *looser*, and backfill existing rows when you do.
3. **Keys are scoped per user.** A global table would leak that another user tailored for the same
   company.

## 7. Schema

Three changes. **No balance column on `users`** — the ledger is the balance.

```php
// balance_transactions — append-only, matching the app's existing convention
$table->foreignId('user_id')->constrained()->cascadeOnDelete();
$table->integer('amount_cents');            // signed: +grant/+topup/+refund, -charge
$table->string('reason');                   // signup_grant | topup | charge | refund
$table->foreignId('job_pairing_id')->nullable()->constrained()->nullOnDelete();
$table->timestamps();
$table->index(['user_id', 'id']);
```

```php
// job_pairings — the paid unit, scoped per user
$table->foreignId('user_id')->constrained()->cascadeOnDelete();
$table->string('billing_key');              // company|title, or '__general__'
$table->string('company')->nullable();      // display only, never identity
$table->string('title')->nullable();
$table->timestamps();
$table->unique(['user_id', 'billing_key']);
```

```php
// ai_requests: add nullable job_pairing_id — powers the abuse fuse in §8
```

Balance is `SUM(amount_cents)` over the user's rows.

```
// ponytail: no cached balance column — SUM over an indexed per-user ledger is
// fine at hundreds of rows and cannot drift. Add a cached column if it shows up
// in profiling, not before.
```

Creating a pairing and debiting the ledger must happen in one transaction.

## 8. Operational rules

**Refunds revoke the pairing.** Unlimited no-questions refunds plus a retained pairing means "get
your money back, keep the work, forever." Refunding credits the balance and voids the pairing; using
AI on that job again charges again. Ungameable without needing a written policy.

**Refund-to-balance and refund-to-card are different mechanisms.** The self-serve "this wasn't
useful" button refunds to *balance* — instant, no Stripe involved. Refunding leftover balance to a
*card* is a separate manual path: Stripe API, processor fees not returned. Ship the first; decide
the second later.

**"Unlimited inside the unit" needs a fuse, not a meter.** No honest user makes 50 calls on one
application; a script would happily make 100,000. Existing `throttle:20,1` covers bursts; add a high
per-pairing ceiling (~200 calls, via `ai_requests.job_pairing_id`) that no real user reaches. This
is a safety limit, not a pricing limit — do not surface it as a quota.

**Existing accounts are a takeaway.** Every current user has 150 free AI calls/month under
`UserLimits`. Cheapest fix is a one-time balance grant at launch. Amount undecided.

**Never-expiring balances are a liability on the books**, and unspent prepaid funds carry
unclaimed-property (escheatment) obligations in some US states. Irrelevant at current scale; do not
let it be a surprise at 10,000 users.

## 9. Settled numbers

| | |
|---|---|
| Signup grant | **$3.00** — `__general__` plus 5 jobs |
| Per job | **$0.50** |
| Balance expiry | Never |
| Refunds | Self-serve, unlimited, revoke the pairing |
| Minimum top-up | **$5.00** |
| Maximum top-up | **$50.00** |
| Preset amounts | **$5 / $15 / $30**, all at face value |
| Volume bonus | **None** |
| Subscription | None |

There is no Stripe integration in this codebase (Cashier was removed 2026-07-14), so payments are
greenfield.

### Why no volume bonus

Stripe's fixed 30¢ makes small top-ups expensive — 8.9% on $5 vs 3.5% on $50 — but the total prize
is small: a user spending $50 costs $4.45 in fees via ten $5 top-ups, or $1.75 in one. **The entire
saving is $2.70.**

Priced honestly as a fee pass-through, the bonus would be $10 → $10.30, $25 → $26.20, $50 → $52.70.
Nobody changes behavior for $1.20 on $25. Making it motivating ($25 → $30) turns it into a discount
wearing a fee-savings costume — and "we are honest about money" is the entire product position.

Three further reasons it stays off:

- **A volume bonus is pressure toward a larger upfront commitment** — a softer version of the annual
  subscription trap rejected in §2. This product's thesis is that its users should not be nudged
  into paying more upfront than they need.
- **The friction is imaginary.** Realistic spend is $5–30 for nearly everyone; a typical search is
  two or three top-ups across three months.
- **The upside is already captured.** Balances never expire, so over-purchase leaves the float and
  often permanent breakage — the benefit of bulk buying without incentivizing it.

The **$50 maximum** matters more than the minimum: a never-expiring balance is a liability line,
escheatment exposure, and a refund headache, in a product where $30 covers an entire job search.
$50 is 100 jobs — more than anyone credibly needs.

## 10. Open decisions

1. **Launch grant for existing accounts** (§8). The only item with a deadline — it must be decided
   before the switch flips.

### Closed

- ~~Volume bonus structure.~~ Settled 2026-07-20: **none**, plus a $50 maximum top-up. Reasoning in §9.
- ~~Whether the signup grant stays $2.~~ Settled 2026-07-20 at **$3.00**.
- ~~Minimum top-up.~~ Settled 2026-07-20 at **$5.00**. Stripe takes 2.9% + $0.30, so $5 loses 8.9%
  to fees vs 3.5% on $10 — but this product's thesis is that its users have real money concerns, and
  a $5 first purchase is materially easier than $10 for someone unemployed. At 95% gross margin the
  fee is affordable; accessibility outweighs it.

## 11. Balance UX

The top-up screen is where this model either reads as honest or reads as a paywall, and the
difference is mostly copy. Treat this section as load-bearing, not polish.

### What still works at $0

Everything except job-targeted AI: resumes, editing, templates, PDF and DOCX export, share links,
analytics, recruiter Q&A, job search, alerts, and interview coach. **This is invisible unless it is
stated.** If the $0 state *feels* like a lockout, this is Zety with extra steps regardless of what
is technically true — so the empty state's first job is not to sell, it is to show that nothing was
taken away.

```
You're out of balance.

Everything else still works — resumes, exports, share links,
job search, and interview practice are always free. Only AI
job tailoring needs balance.
```

### Three states

**Healthy** — persistent, in the header, both units. Dollars for honesty, jobs for meaning; $0.50 is
abstract, "9 jobs" is how people think about a search.

```
$4.50 · 9 jobs
```

**Low** — triggered below $1.00, so the user can act before being blocked rather than after.

```
$0.50 left — 1 more job.  [Add funds]
```

**Empty** — options priced in what they buy, with the three reassurances shown *every time*, never
buried in an FAQ. They answer the exact doubt the user has at that exact moment.

```
Add $5  → 10 jobs
Add $15 → 30 jobs
Add $30 → 60 jobs

Never expires. Refundable anytime. No subscription.
```

### Charge at the front, never mid-task

The unit is a whole job, so the balance check happens **before** work starts. Being blocked halfway
through a cover letter is the worst experience this model can produce. The schema already puts the
debit at pairing creation, so the gate is naturally at the front — the UI must make it legible:

```
Tailor for Senior PM at Acme — $0.50
Includes unlimited rewrites, cover letters, and revisions
for this job, forever.

Balance after: $4.00
```

Every action that would create a pairing shows its price first. No hidden charges.

### Advertise that revisions are free

On the job itself, once paid:

```
Paid · unlimited revisions for this job
```

Pricing per-job instead of per-call exists to remove rationing anxiety (§4) — **but that only works
if the user knows.** Someone who never sees this badge will still ration out of habit, and the
benefit is paid for without being received. Cheapest high-value copy in the design.

Same reasoning for the refund control: put it near the output, not in settings. Unlimited
no-questions refunds that are hard to find are not unlimited.

### No manufactured urgency

No countdowns, no "limited time", no red alarms. The balance genuinely never expires, so there is no
urgency — inventing some would be the first lie told, and it is the exact register every gated
competitor operates in. **A low balance is information, not an alarm.**

## 12. Preconditions — do not implement before these

Every number in §9 is a reasoned guess. None of it has met a real user. As of 2026-07-20 the local
database holds **one account** (created 2026-07-19, consistent with a `migrate:fresh --seed`) and
`ai_requests` is **empty** — so there is no usage data behind any of this. Production counts are
unknown and must be checked before §10's launch grant can be settled.

The design is not the constraint. **Distribution is.** Pricing is cheap to change later; the only
lock-in here is schema, and §7 captures that well enough to build in a week whenever the data says
go.

### The arithmetic that decides everything

A $3 grant covers `__general__` ($0.50) plus five jobs. **So a user pays nothing until their sixth
tailored job.** That single fact means:

> If the median user tailors five jobs or fewer, **the median user never pays anything, ever.**

That is not a pricing bug — it is a bet on behaviour. Most job seekers spray one generic resume at
most postings and tailor only a handful. If that is what real users do here, revenue per user is
roughly $0–2 and the model produces nothing regardless of how well-designed it is. Nobody has
watched a single real user do this.

### The five numbers to collect

Thresholds below are **judgment**, not research — they are starting lines for a decision, not
findings.

| # | Number | Why it matters | Re-base the model if |
|---|---|---|---|
| 1 | **Median jobs tailored** per user who finishes a resume | Sets whether the median user ever crosses the paid threshold | median ≤ 6 |
| 2 | **% of users exceeding 6 tailored jobs** | This is the true conversion rate — everything below it is free | < 15% |
| 3 | **p90 jobs tailored** | Revenue depends on a heavy tail; without one, totals are negligible | p90 < 15 |
| 4 | **Week-2 return rate** | A user who never comes back never reaches a paid moment | most users never return |
| 5 | **Observed cost per AI call** | §3's figures are modelled, never measured | actuals exceed §3 by >3x |

### How to collect them without building billing

**Build §7's `job_pairings` and `balance_transactions` with every price set to $0.**

That yields numbers 1–3 exactly — real pairing records, real per-user distributions — with no
payment infrastructure, no Stripe, no paywall, and nothing for a user to notice. Turning pricing on
later becomes a config change rather than a migration. It is also the honest version: you are
measuring behaviour, not quietly metering someone.

Number 5 requires fixing `ai_requests.estimated_cost_cents` (§3) to decimal or micro-cents first —
until then every `gpt-4o-mini` call rounds to zero and the column records nothing.

For willingness-to-pay, a fake door is defensible **only if it stays honest**: when the grant runs
out, show the §11 top-up screen and, on click, say payments are not live yet and refill the balance
for free. That measures intent, keeps the promise, and costs pennies.

### Stop rule

Ship the app as it stands — `AI_MONTHLY_LIMIT=150` is already a working cost control and the product
is already free and unlimited. **Do not write payment code, add Stripe, or gate a single feature
until numbers 1–3 exist.** If they come back below the thresholds above, the fix is the grant size or
the unit, not the price — and finding that out after building billing is the expensive order to do
it in.

## 13. First implementation slice

When approved, the smallest slice that tests the model — **no Stripe at all**:

1. `balance_transactions` + `job_pairings` + `ai_requests.job_pairing_id`
2. `billingKey()` with tests covering the cross-source split cases in §6
3. The AI gate: free features pass through; paid features resolve or create a pairing
4. Top-ups seeded manually via a console command

That proves whether $0.50-per-job feels right before any payments infrastructure exists.
