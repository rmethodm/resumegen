# Prepaid Pricing Model — Resumegen

**Status: PROPOSAL. §13's instrumentation is built at prices of 0; no billing is implemented, and §12 argues it should not be yet.**
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
unlimited AI against that job forever, including every revision. Balances never expire. Unspent
balance is always refundable, and a purchased job is refundable until its first AI call (§8). There
is no subscription and no recurring charge of any kind.

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

Related: **`ai_requests.estimated_cost_cents` records 0 for every OpenAI call**, and the fix is not
only the column type. `AiService::estimateCostCents()` ends in `(int) round($cents)`, so the value
is already 0 in PHP before it reaches the `integer` column — anything under half a cent rounds away,
which is every `gpt-4o-mini` call including a 15k-token page import. Migrating the column alone
would change nothing.

Everything downstream reads that zero: `ai:cost-alert` (so the daily spend alarm cannot fire),
`AiUsageReport`, `AdminStatsOverview`, and `AiUsersPage`. Anthropic calls are ~20x pricier and do
log a coarse non-zero, which is why this has not looked completely dead. Drop the rounding *and*
store micro-cents before treating number 5 in §12 as measurable.

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
ever. A $5 signup grant is therefore general polish plus nine real jobs.

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
$table->timestamp('refunded_at')->nullable();
// NOTE: not a plain unique — §8 replaces this with a partial unique index over
// live rows only, so a refunded job can be bought again.
$table->unique(['user_id', 'billing_key']);  // superseded by §8
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

### Refunds — settled 2026-07-20

An earlier draft promised unlimited no-questions refunds that revoked the pairing. **That does not
close the loop.** Revoking a pairing stops only *future* AI on that job; the output already
generated is written into the resume and cover letter and survives the refund, so the exploit is:
pay $0.50, generate everything, refund, repeat forever on the same $0.50. Not adversarial — it is
what a rational user does once they notice, and §11 deliberately puts the refund control next to
the output.

**The rule: a pairing is self-serve refundable until its first successful AI call.** After that it
is final. This is not "unlimited refunds" and must never be described as such.

#### Three different refunds — do not conflate them

| Refund | Rule | Mechanism |
|---|---|---|
| **Unused balance → card** | Always, no conditions | Manual Stripe path; processor fees not returned |
| **Unused pairing → balance** | Only before first successful AI call | Self-serve, instant, no Stripe |
| **Used pairing** | Not self-serve | Support discretion only |

The first row is what carries most of the honesty claim, and it survives intact: **money you never
spent is always yours.** That is unconditional and needs no window, because no output exists to keep.
The window applies only to the second row.

#### What "first successful AI call" means

The pairing is refundable while it has no `ai_requests` row with `status = 'success'` and a matching
`job_pairing_id`. Failures must not burn the refund right:

- A provider error, timeout, or non-2xx logs non-success — still refundable.
- A `ModerationException` rejection produces no output — still refundable.
- Only a call that actually returned usable content closes the window.

The debit happens at pairing creation, *before* any AI runs (§11, "charge at the front"), so there
is always a real window — a misclick or a wrong-job purchase is genuinely reversible.

#### Schema consequence

`job_pairings` needs `refunded_at` (nullable timestamp), and the unique constraint must exclude
refunded rows, or a user who refunds a mistake can never buy that job again:

```php
// Replaces $table->unique(['user_id', 'billing_key']) from §7.
// Partial unique index — one *live* pairing per job per user; refunded rows step aside.
// Postgres and SQLite both support this, so tests exercise the real constraint.
DB::statement(
    'CREATE UNIQUE INDEX job_pairings_user_billing_key_live
     ON job_pairings (user_id, billing_key) WHERE refunded_at IS NULL'
);
```

Refunding writes a `+50` ledger row (`reason = 'refund'`, `job_pairing_id` set) and stamps
`refunded_at` — in one transaction, same as the debit. The pairing row is **kept, not deleted**: it
is the audit trail, and `nullOnDelete` on the ledger FK would erase which job was refunded.

Re-buying a refunded job creates a new pairing at full price. Ledger history shows both.

#### What this costs, honestly

It gives up the "I ran it and the output wasn't useful" case — which is the case users most want a
refund for. That is a real loss, accepted because the alternative is a product that is free for
anyone who notices. Two mitigations:

- **Support discretion stays open.** A genuine dissatisfaction refund is a manual admin action, not
  a policy the UI advertises. Per `CLAUDE.md`, that write goes through `AdminAuditLog::record()`.
- **Output quality is the actual fix.** A refund window is not a substitute for the coach path (§5)
  producing something the user wants to keep.

**Watch for the inverse abuse:** buy → refund → buy → refund on the same job, repeatedly. It gains
the user nothing (no AI ran) but it is a signal of someone probing. Visible in `balance_transactions`;
no code needed for it now.

**"Unlimited inside the unit" needs a fuse, not a meter.** No honest user makes 50 calls on one
application; a script would happily make 100,000. Existing `throttle:20,1` covers bursts; add a high
per-pairing ceiling (~200 calls, via `ai_requests.job_pairing_id`) that no real user reaches. This
is a safety limit, not a pricing limit — do not surface it as a quota.

### Launch grant for existing accounts — written up 2026-07-20

**Existing accounts are a takeaway.** Every current user has 150 free AI calls/month under
`UserLimits`, forever. Switching to prepaid replaces an unlimited recurring allowance with a finite
balance. For an active user that is strictly worse, and doing it silently to people mid-job-search
is the one move that would justify the comparison to the gated cohort §2 defines itself against.

#### Granted dollars are not withdrawable — the constraint that shapes everything else

§8 makes unspent balance unconditionally refundable **to card**. Applied to granted money, that is a
cash-extraction vector, not a generosity: register accounts, collect the grant, withdraw real money.
`RegisteredUserController` caps registration at 5 accounts per IP per 24h, which slows a farm but
does not stop one. **This applies to the $5 signup grant in §9 just as much as to the launch grant** —
it was never spelled out there and must be.

> **Granted balance is spendable, never withdrawable. Only money the user actually paid can be
> refunded to a card.**

The ledger already distinguishes these by `reason`, so the rule is computable without new columns:

```
refundable_to_card = min(
    current_balance,
    SUM(topup) - SUM(card_refund)      // lifetime, per user
)
```

Safe regardless of the order grants and top-ups are spent in, and it needs no "which dollars did
this charge consume" bookkeeping. **A user who never paid can never withdraw**, which is the whole
requirement. Refund-*to-balance* (§8's pairing window) is unaffected — it moves money within the
account and creates no extraction path.

#### Who qualifies

Not every row in `users`. The grant compensates a takeaway, so it should follow evidence the account
was real and used:

- **Email verified** — `User` implements `MustVerifyEmail` and the `verified` middleware gates the
  whole app, so an unverified account never had the allowance being taken away.
- **Owns at least one resume** — the cheapest available proxy for "actually used this."

Dormant-but-real accounts that come back later are covered by the ordinary $5 signup-grant path
being extended to them on next login, or by support. Do not stretch the launch grant to cover
everyone in case someone returns; that maximizes liability for the least real benefit.

#### Amount — decision rule, not a number

Still blocked on **how many accounts qualify in production**, which is unknown; the local database
holds one seeded account (2026-07-20) and tells us nothing.

| Qualifying accounts | Grant | Reasoning |
|---|---|---|
| Under ~200 | **$15** (30 jobs) | Total liability under $3,000, and at that scale the engineering time spent optimizing costs more than the grant. Be generous and stop thinking about it. |
| Hundreds to low thousands | **$10** (20 jobs) | Still comfortably above a realistic single search; liability becomes a real line item worth bounding. |
| Many thousands | Model it | Segment by observed usage. At that size the §12 numbers exist, so guessing is no longer necessary. |

The floor is **$8**: it must clear "more than a new user gets for free," and the signup grant rose
to $5 on 2026-07-20 (§9). A launch grant at or below $5 would leave existing users — the ones being
taken from — no better off than a stranger signing up that day.

#### Mechanics

1. **A console command, run once** — `php artisan balance:launch-grant`, with `--dry-run` reporting
   the qualifying count and total liability before anything is written.
2. **Idempotent, enforced in the database.** A partial unique index on
   `balance_transactions (user_id) WHERE reason = 'launch_grant'` makes a double-run impossible
   rather than merely unlikely. A re-run after a partial failure is the expected case, not an edge
   case, and this is money.
3. **Audit it.** `AdminAuditLog::record()` per `CLAUDE.md`, with the amount and qualifying count in
   `meta`.
4. **Grant before the switch, not at it.** Users should see the balance already sitting there when
   pricing appears, not arrive at a paywall and be told compensation is coming.
5. **Tell them first**, in the terms §11 uses: what changed, what is still free (nearly everything),
   what the balance is, and that it never expires. A takeaway announced plainly is survivable; one
   discovered mid-task is not.

**Never-expiring balances are a liability on the books**, and unspent prepaid funds carry
unclaimed-property (escheatment) obligations in some US states. Irrelevant at current scale; do not
let it be a surprise at 10,000 users.

## 9. Settled numbers

| | |
|---|---|
| Signup grant | **$5.00** — `__general__` plus 9 jobs. Spendable, **never withdrawable** (§8) |
| Per job | **$0.50** |
| Balance expiry | Never |
| Refunds | Unspent balance always; a job until its first AI call (§8) |
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

1. **Launch grant amount** (§8). Qualifying criteria, withdrawability, and mechanics are settled;
   only the dollar figure is open, and it follows the decision rule in §8 once the production
   count of qualifying accounts is known. Must be decided before the switch flips.
2. **Grant size vs free-tier competitiveness** (§14). Partly acted on 2026-07-20: the grant rose
   $3 → $5, narrowing the free-tier gap (15 free Jobscan scans vs 9 free jobs over a search) at the
   cost of pushing the first paid job to the 10th. The coupling itself is not resolved — the grant
   is still both levers at once, and $5 was chosen without data on either side. Re-derive §12's
   thresholds if it moves again.

### Closed

- ~~The refund loop.~~ Settled 2026-07-20: **a pairing is self-serve refundable until its first
  successful AI call**; unspent balance stays unconditionally refundable. Reasoning and schema in §8.
- ~~Volume bonus structure.~~ Settled 2026-07-20: **none**, plus a $50 maximum top-up. Reasoning in §9.
- ~~Whether the signup grant stays $2.~~ Settled 2026-07-20 at **$5.00** — raised from $3 the same
  day for free-tier competitiveness (§14). Knowingly moves the first paid job from 6 to 10 and makes
  §12's bet harder; revisit together with the unit price once §12's numbers exist.
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

Never expires. Unused balance always refundable. No subscription.
```

> Earlier drafts said "Refundable anytime." **Do not restore that line** — §8's window makes it
> false for pairings, and shipping a promise you later narrow is the precise move §2 accuses the
> gated cohort of. The claim above is the strongest true one: unspent money is unconditionally
> refundable, because no output exists to keep.

### Say the window at the moment of purchase

The window is only fair if it is stated before the click, not discovered after. The §11 purchase
confirmation carries it:

```
Tailor for Senior PM at Acme — $0.50
Includes unlimited rewrites, cover letters, and revisions
for this job, forever.

Refundable until you run the first rewrite.
Balance after: $4.00
```

Once the first successful call lands, the refund control disappears rather than erroring — and says
why, once, where the control used to be:

```
Paid · unlimited revisions for this job
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

Same reasoning for the refund control: put it near the job, not in settings. A refund window nobody
can find is not a refund window — and because §8 closes it at the first successful call, burying it
would mean most users never see it while it is still open.

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

A $5 grant covers `__general__` ($0.50) plus nine jobs. **So a user pays nothing until their tenth
tailored job.** That single fact means:

> If the median user tailors nine jobs or fewer, **the median user never pays anything, ever.**

That is not a pricing bug — it is a bet on behaviour. Most job seekers spray one generic resume at
most postings and tailor only a handful. If that is what real users do here, revenue per user is
roughly $0–2 and the model produces nothing regardless of how well-designed it is. Nobody has
watched a single real user do this.

**Raising the grant from $3 to $5 on 2026-07-20 moved this line from job 6 to job 10 — it made the
bet substantially harder to win.** That was a deliberate trade for free-tier competitiveness (§14),
made with no data on either side of it. The thresholds below moved with it and are no longer the
numbers the first draft used; they are *derived from* the grant, not independent judgments, so any
further change to the grant must re-derive them again.

### The five numbers to collect

Thresholds below are **judgment**, not research — they are starting lines for a decision, not
findings.

| # | Number | Why it matters | Re-base the model if |
|---|---|---|---|
| 1 | **Median jobs tailored** per user who finishes a resume | Sets whether the median user ever crosses the paid threshold | median ≤ 10 |
| 2 | **% of users exceeding 9 tailored jobs** | This is the true conversion rate — everything below it is free | < 15% |
| 3 | **p90 jobs tailored** | Revenue depends on a heavy tail; without one, totals are negligible | p90 < 12 |
| 4 | **Week-2 return rate** | A user who never comes back never reaches a paid moment | most users never return |
| 5 | **Observed cost per AI call** | §3's figures are modelled, never measured | actuals exceed §3 by >3x |

**Number 3 is now the tightest of the five.** At a $5 grant the first paid job is the 10th, so a p90
of 12 means the *ninetieth-percentile* user pays for three jobs — $1.50, once, ever. Revenue is not
merely tail-dependent, it depends on the tail being long, not just present. If the data shows a p90
in the low teens, the grant is too large for the unit price and one of the two has to move.

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

## 14. The competitor question — why pay anything?

> *"Jobscan gives me five free scans a month. Teal has a free tier. Reactive Resume is free forever.
> Why would I pay you $0.50?"*

Facts below are from `resume-builder-competitive-analysis.md` §1, which verified them. The reasoning
is judgment.

### The comparison is not free-vs-$0.50

Every free tier in the ungated cohort is **itself AI-metered**, and metered at a level deliberately
short of a real search:

| Vendor | Free AI allowance | Cost the moment you exceed it |
|---|---|---|
| **Jobscan** | 5 scans/month (rollover, cap 5) | ~$49.95/mo |
| **Teal** | ~5–10 AI credits | $29/mo |
| **Kickresume** | None — AI Writer is paid | $24/mo, or $96 upfront for the $8/mo annual |
| **Reactive Resume** | Unlimited, BYO API key | $0 |

They gave away export, resumes, and templates — the things that cost nothing — and put the wall
exactly where we do: **AI volume**. Nobody in this market gives away unlimited AI. The disagreement
is about the *shape* of the wall, not its existence.

So the real question is what a whole search costs. For a user tailoring 12 jobs over three months:

| | Cost |
|---|---|
| **Resumegen** | $5 grant covers 9 → 3 more at $0.50 = **$1.50** |
| **Teal** | $29/mo × 3 = **$87** |
| **Jobscan** | $49.95/mo × 3 = **$150** |
| **Kickresume** | **$96** upfront (annual) or $72 monthly |

**That is the answer, and it is a strong one.** It is not "cheaper per unit" — it is one to two
orders of magnitude cheaper for the actual job to be done, because the competitor charges for
*time* while the user consumes *jobs*, and a 3-month search pays for 3 months either way.

### The honest weaknesses

**1. Our free tier is worse than Jobscan's over a full search.** Jobscan's 5 scans/month recur; our
$5 grant is one-time. Over three months that is **15 free scans vs 9 free jobs** — closer since the
grant rose from $3 on 2026-07-20, but still behind. A user comparing free tiers side by side sees us
as *less* generous, and the first-glance comparison is the one that happens.

The rebuttal — a pairing is unlimited AI on that job forever while a scan is one match report — is
true and is a per-unit argument that loses to a bigger number on a pricing page. This is a real
disadvantage, not a framing problem.

**It also couples directly to §12.** The grant size is simultaneously the free-tier competitiveness
lever *and* the thing that decides whether the median user ever pays. Those pull in opposite
directions and cannot both be optimized. Decide them together, with the §12 data, or not at all.

**2. Zero is not a price.** "Free" beats "$0.50" for reasons arithmetic does not touch; a $0.50
charge introduces a decision where none existed. The $5 grant softens the first encounter but does
not remove it.

**3. Free tiers stack.** Nothing stops a user running Jobscan's 5 scans, Teal's credits, and
Kickresume's builder at $0 forever. The friction is three accounts and no single workspace — real,
but not a moat.

**4. Reactive Resume is genuinely free and unlimited.** It costs an API key and some setup, which
filters to technical users. That is a different audience, not a defeated competitor.

**5. Our differentiators are unverified.** `resume-builder-competitive-analysis.md` §2 lists share
analytics, recruiter Q&A, A/B variants, and the coach path as possible leads with **"absence of
evidence is mostly absence of research."** None can be leaned on until someone checks.

### What the position actually is

Not "cheaper." Not "more generous." It is:

> **You pay for the jobs you pursue, not the weeks you spend looking — and we stop charging when you
> stop, because we never started a subscription.**

That is true, verifiable, unavailable to every vendor in §1 except Reactive Resume, and it inherits
§2's structural point rather than resting on the unverified feature table. It is also the *only*
claim here that survives scrutiny without qualification.

### What would actually settle it

None of the above is evidence about willingness to pay. The §12 fake door is — when the grant runs
out, show the top-up screen, and on click say payments are not live and refill for free. Clicks
measure intent against a real price; this section only measures whether the argument is coherent.

**Do not treat this section as an answer that unblocks building.** It establishes the pitch is
defensible, not that anyone will buy.
