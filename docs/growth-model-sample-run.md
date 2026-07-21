# Growth model — sample run (2026-07-20)

**These numbers are invented.** Every figure below comes from `GrowthSampleSeeder`, which
fabricates 12 months of traffic so the prepaid model in `prepaid-pricing-model.md` can be
argued about before the real thing has any users. Nothing here is observed. It does not
satisfy §12's stop rule, which requires real usage data.

Regenerate:

```bash
php artisan db:seed --class=GrowthSampleSeeder   # ~1,400 accounts, deterministic, self-clearing
php artisan pricing:growth --infra=15            # the P&L below
php artisan pricing:usage                        # the jobs distribution below
```

Every lever is overridable per run, so scenarios sweep without editing the seeder:

```bash
GROWTH_GRANT_CENTS=200 GROWTH_JOB_CENTS=50 GROWTH_TOPUP_CENTS=500 \
GROWTH_ACTIVATION_PCT=55 GROWTH_JOBS_SCALE_PCT=100 GROWTH_RAMP_PCT=125 \
GROWTH_GENERAL_FREE=0 \
  php artisan db:seed --class=GrowthSampleSeeder
```

Prices in cents; `ACTIVATION_PCT` and `JOBS_SCALE_PCT` are percentages; `RAMP_PCT` is the
month-over-month signup multiplier (125 = 1.25x) and replaces the published ramp when set;
`GENERAL_FREE=1` makes the reserved `__general__` pairing cost nothing. Each run echoes the
scenario it is seeding, so a sweep's output is self-labelling.

The seeder writes at the **proposed** prices, not `config/pricing.php`, which is still 0 —
a profitability report against a price of zero says nothing.

**Clean up afterwards:** re-running the seeder clears its own accounts, or
`DELETE FROM users WHERE email LIKE '%@growth.sample'`.

## The headline: cash is not profit

`pricing:growth`'s "Revenue" column is **cash collected from top-ups**. Prepaid balance is
a liability until spent, and §10 makes it never-expiring and unconditionally refundable.
Cutting the signup grant mostly buys *unspent balance*, so the cash figure overstates the
business badly at small grants. Both views, across the scenarios swept:

| Scenario | Grant | Price | Min top-up | Payers | Cash net @ $40 infra | **Accrual net @ $40** | **Accrual net @ $15** | Deferred liability |
|---|---|---|---|---|---|---|---|---|
| Baseline | $5 | 50c | $5 | 5.2% | −$112.83 | −$319.79 | −$19.79 | $207 |
| **B** | **$2** | **50c** | **$5** | **25.5%** | **+$1,335.67** | **+$160.70** | **+$460.70** | $1,175 |
| C | $1 | 50c | $10 | 41.2% | +$5,042.23 | +$504.23 | +$804.23 | $4,538 |
| C2 | $1 | 50c | $5 | 41.2% | +$2,415.21 | +$567.24 | +$867.24 | $1,848 |
| D | $2 | 75c | $10 | 41.5% | +$5,268.08 | +$855.08 | +$1,155.08 | $4,413 |
| **D2** | **$2** | **75c** | **$5** | **41.5%** | **+$2,784.18** | **+$896.18** | **+$1,196.18** | **$1,888** |

Accrual revenue counts only paid dollars actually spent on jobs (grant dollars burn first
and are discount, not income). Scenario C's +$5,042 cash is 77% money being held for users
who have not spent it — on accrual it is +$504.

**D and D2 were re-measured on 2026-07-20**, replacing an earlier D row that carried an
estimated cash figure (+$6,080) and no payer count. Both re-runs used per-user FIFO for the
grant-vs-cash split — grant dollars burn first *within each user's own ledger*. A global
FIFO is wrong and inverts the sign: it lets unspent grant belonging to users who never paid
offset the cash spend of users who did, which reported D as −$224 instead of +$1,155.

**D2 dominates D.** Same price, same 41.5% payers, same $1,707 recognised, marginally better
accrual — on **57% less deferred liability**, because a $5 minimum does not force users to
pre-fund jobs they have not decided to buy. D's larger cash number is mostly other people's
money. This agrees with §9's $5 minimum, which was settled on accessibility grounds.

**The 75c rows assume zero price elasticity.** The seeder tailors the same 3,145.50 of jobs
at 75c as at 50c; the gain comes entirely from more users crossing the top-up wall (a $2
grant buys 2.67 jobs instead of 4), not from margin. Real demand falls at a 50% price rise
by some amount this model cannot estimate. Treat every 75c figure as an upper bound.

**Two levers, ranked.** The $480 infra floor is larger than the entire baseline loss:
dropping to a ~$15/mo box reaches roughly breakeven on accrual with *no pricing change at
all*. The grant is the second lever, and the one §12 already flags as wrong-sided.

## Scenario B — $2 grant, 50c/job, $5 minimum top-up, $15/mo infra

The recommended change, because it moves only the grant. The $0.50 price (§4's anti-markup
argument) and the $5 minimum top-up (§10's accessibility argument) both survive untouched.
Mechanism: the median user tailors 3–4 jobs, and a $2 grant covers `__general__` plus 3
jobs, so the median user reaches a card on roughly their 4th.

```
+---------+---------+--------+------+---------+---------+--------+--------+---------+------------+
| Month   | Signups | Active | Jobs | Revenue | AI cost | Stripe | Infra  | Net     | Cumulative |
+---------+---------+--------+------+---------+---------+--------+--------+---------+------------+
| 2025-08 | 20      | 10     | 27   | $5.00   | $0.10   | $0.45  | $15.00 | -$10.55 | -$10.55    |
| 2025-09 | 26      | 20     | 49   | $45.00  | $0.18   | $4.01  | $15.00 | $25.81  | $15.26     |
| 2025-10 | 34      | 26     | 68   | $25.00  | $0.23   | $2.23  | $15.00 | $7.54   | $22.80     |
| 2025-11 | 44      | 38     | 120  | $60.00  | $0.39   | $5.34  | $15.00 | $39.27  | $62.07     |
| 2025-12 | 57      | 61     | 178  | $100.00 | $0.57   | $8.90  | $15.00 | $75.53  | $137.60    |
| 2026-01 | 74      | 83     | 228  | $135.00 | $0.70   | $12.02 | $15.00 | $107.28 | $244.88    |
| 2026-02 | 95      | 97     | 229  | $125.00 | $0.72   | $11.13 | $15.00 | $98.15  | $343.03    |
| 2026-03 | 122     | 115    | 340  | $225.00 | $1.03   | $20.03 | $15.00 | $188.94 | $531.97    |
| 2026-04 | 157     | 155    | 419  | $240.00 | $1.31   | $21.36 | $15.00 | $202.33 | $734.30    |
| 2026-05 | 200     | 207    | 561  | $355.00 | $1.80   | $31.60 | $15.00 | $306.60 | $1,040.90  |
| 2026-06 | 255     | 241    | 663  | $400.00 | $2.04   | $35.60 | $15.00 | $347.36 | $1,388.26  |
| 2026-07 | 325     | 303    | 535  | $290.00 | $1.78   | $25.81 | $15.00 | $247.41 | $1,635.67  |
+---------+---------+--------+------+---------+---------+--------+--------+---------+------------+
```

Cash breakeven lands in **month 2** rather than around month 14. On accrual it is
+$460.70 over the year. The final row is the current month and is partial — that is why
jobs drop from 663 to 535.

## Unit economics (scenario B)

```
+--------------------------+-----------------------------+
| Gross margin on AI       | 99.5%                       |
| AI cost per job tailored | 0.32 cents (vs a 50c price) |
| Paying users / all users | 359 / 1409 (25.5%)          |
| Revenue per paying user  | $5.58                       |
| Fixed cost to cover      | $180.00 over 12 months      |
+--------------------------+-----------------------------+
```

## §12 thresholds, re-derived for a $2 grant

§12 is explicit that its triggers are *derived from* the grant, so changing the grant
requires re-deriving them. They are now stated as formulas of `GRANT_JOBS` in
`PricingUsageReport`, so the next change is arithmetic rather than archaeology:

| Trigger | Formula | At $5 grant (G=9) | At $2 grant (G=3) |
|---|---|---|---|
| Median | `median <= G + 1` | median ≤ 10 | **median ≤ 4** |
| p90 | `p90 < G + 3` | p90 < 12 | **p90 < 6** |
| Conversion | `% exceeding G < 15%` | exceeding 9 < 15% | **exceeding 3 < 15%** |

Measured against the modelled distribution (median 3, p90 9, 49.0% exceeding 3):

```
+------------------------+-------------+-------------+
| Metric                 | Value       | Re-base if  |
+------------------------+-------------+-------------+
| Users with >=1 job     | 733         | —           |
| Median jobs tailored   | 3           | median <= 4 |
| p90 jobs tailored      | 9           | p90 < 6     |
| Users exceeding 3 jobs | 359 (49.0%) | < 15%       |
+------------------------+-------------+-------------+
```

p90 and conversion clear comfortably. **The median trigger still trips** — at 3 jobs the
median user spends exactly their grant and never reaches a card. A $2 grant is profitable
but still on the wrong side of §12's own median rule, just by less than $5 was.

### The $1 alternative (C2), flagged not adopted

Only a $1 grant clears all three (`median ≤ 2` vs an observed 3), and it is better on
accrual too: **+$567.24 @ $40 infra, +$867.24 @ $15**, versus B's +$160.70 / +$460.70. It
keeps the $5 minimum top-up, so accessibility survives.

It is not adopted because the free tier would fall to `__general__` plus a single job,
which is a large retreat from the 15-free-Jobscan-scans comparison §14 weighs the grant
against. §14 is explicit that free-tier competitiveness and conversion pull in opposite
directions and must be decided together, with real data. Deciding that on invented numbers
is exactly what §12's stop rule forbids, so both are recorded and neither is settled.

## Refunds are already in the number — accrual is the pessimistic bound

An earlier reading of this model treated refunds as an unmodelled risk that might erase
scenario B. That was wrong, and the error is worth recording because it points the wrong
way. Accrual net counts only paid dollars actually spent on jobs, while subtracting the
Stripe fee on *every* dollar collected — which is arithmetically identical to refunding
100% of unspent balance:

```
net(refund rate r) = recognised + deferred x (1 - r) - stripe - ai - infra
  r = 1  (all refunded)  -> recognised - stripe - ai - infra  = the accrual figure
  r = 0  (none refunded) -> cash - stripe - ai - infra        = the cash figure
```

The two views reported above are therefore not competing measures; they are the **bounds
of the same measure**, and every real outcome sits between them. Scenario B at $15/mo
infra:

| Refund rate | Net |
|---|---|
| 100% — every user reclaims their balance | +$460.70 |
| 50% | +$1,048.20 |
| 0% — full breakage | +$1,635.67 |

So unspent balance is **upside, not exposure**. What it does carry is escheatment duty and
a support burden, neither of which is a P&L line here.

## Sensitivity sweep

Sixteen runs, each varying one assumption against scenario B. Ranked by how far they move
accrual net at $15/mo infra (baseline +$460.70):

| Assumption | Low | High | Swing |
|---|---|---|---|
| Price per job (25c / 75c) | −$88.21 | +$1,211.69 | **$1,299.90** |
| Signup ramp (1.00x / 1.40x) | −$34.64 | +$871.29 | **$905.93** |
| Jobs per activated user (x0.5 / x1.5) | +$14.97 | +$915.06 | **$900.09** |
| Activation rate (28% / 83%) | +$159.64 | +$818.37 | $658.73 |
| Signup grant ($3 / $1) | +$220.85 | +$867.24 | $646.39 |
| Infra ($22.50 / $7.50 per month) | +$370.70 | +$550.70 | $180.00 |
| Stripe fees (±50%) | +$371.48 | +$549.93 | $178.45 |
| AI cost (±50%) | +$455.28 | +$466.13 | $10.85 |

**The price arm is the largest and the least trustworthy** — it assumes job counts do not
respond to price, which is almost certainly false for a cash-constrained population. Treat
it as an upper bound on the price lever, not a forecast.

Excluding price, the top three are all *assumptions about user behaviour* rather than
settings anyone controls — and two of them (jobs per user, activation) are the two the
assumptions table marks "Lowest — invented". They jointly swing ~$1,560. **These are what
§12 should be instrumented to measure**; the pricing knobs are second-order by comparison.

### Activation rate

| Activation | Accrual @ $40 infra | Accrual @ $15 infra |
|---|---|---|
| 28% | −$140.36 | +$159.64 |
| 40% | −$60.44 | +$239.56 |
| 55% (modelled) | +$160.70 | +$460.70 |
| 70% | +$284.64 | +$584.64 |
| 83% | +$518.37 | +$818.37 |

At $40/mo infra the model needs roughly **44% activation** to break even. At $15/mo it
stays positive across the entire plausible range — profitability survives a badly
pessimistic activation assumption, but only once infra is cut. **The infra lever is what
makes the model robust; the pricing levers only make it bigger.**

### Growth ramp

| Monthly ramp | Signups over 12mo | Accrual @ $15 infra |
|---|---|---|
| 1.00x (flat, 20/mo) | 240 | −$34.64 |
| 1.10x | 427 | +$46.86 |
| ~1.28x (modelled) | 1,409 | +$460.70 |
| 1.40x | 2,786 | +$871.29 |

Breakeven sits near **1.04x/month**, consistent with the cohort-derived figure of 18
signups/month at $15/mo infra. Flat growth loses money at any grant — no pricing choice
rescues a product nobody new arrives at.

### A free `__general__` pairing

Every activated user currently spends 50c of their grant on the reserved `__general__`
pairing before touching a real job, so a $2 grant buys three jobs, not four. Making it free
was tested two ways:

| Scenario | Payers | Accrual @ $15 infra |
|---|---|---|
| B — $2 grant, `__general__` charged | 25.5% | +$460.70 |
| $2 grant, `__general__` free | 19.3% | +$322.59 |
| **$1.50 grant, `__general__` free** | **25.5%** | **+$460.70** |

The third row is **identical to scenario B in every figure** — payers, cash, deferred,
recognised. That is not a coincidence: a $1.50 grant with a free `__general__` and a $2
grant with a charged one both buy exactly three jobs. Making `__general__` free is
economically equivalent to cutting the grant by 50c.

That makes it a **free framing win**. "Your first three tailored jobs and a general resume,
on us" describes the same economics as today's grant but reads as more generous, and it
stops the reserved pairing from silently eating a quarter of the grant. It does not
dissolve §14's tradeoff — the second row shows that keeping $2 *and* making `__general__`
free costs $138 and 6 points of conversion — but it buys perceived free-tier value at
literally zero cost.

## Findings

1. **The behavioural assumptions dominate every pricing knob.** Ramp, jobs per user, and
   activation swing accrual net by $900, $900 and $659 respectively; the grant swings $646,
   infra $180, Stripe $178, AI $11. Two of the top three are the assumptions this document
   marks "Lowest — invented". Any effort spent tuning prices before measuring those two is
   spent on the wrong end of the problem.

2. **Cutting infra is what makes the model robust; pricing only makes it bigger.** At
   $40/mo the model needs ~44% activation to break even. At $15/mo it survives 28%
   activation and every grant tested. Infra is also the only lever with no product cost
   attached — no accessibility argument, no free-tier retreat, no §14 tradeoff.

3. **Refunds are already priced in, and unspent balance is upside.** The accrual figure is
   the 100%-refund bound, not the central case. This corrects an earlier reading of this
   model that treated refund exposure as a threat to scenario B.

4. **Infra, not AI, is the cost structure.** $11 of model spend across ~3,400 jobs, 0.32c
   against a 50c price, versus a $480/yr infra floor that exceeds the entire baseline loss.
   This is the opposite of the assumption that motivated metering AI — worth revisiting
   `AI_MONTHLY_LIMIT` if it ever constrains a real user.

5. **Making `__general__` free is a free framing win.** Economically identical to cutting
   the grant 50c, but describes a more generous free tier and stops the reserved pairing
   quietly consuming a quarter of a $2 grant.

6. **Stripe takes ~9% of revenue at a $5 minimum,** and a $10 minimum halves that drag —
   but C2 beats C on accrual anyway, because the larger minimum buys liability, not income.

## Assumptions (all constants at the top of `GrowthSampleSeeder`)

| Assumption | Value | Confidence |
|---|---|---|
| Signup ramp | 20/mo growing ~1.25x, no paid acquisition | Low — arbitrary |
| Activation (ever tailors a job) | 55% | **Lowest — invented** |
| Jobs per activated user | banded, median 3 / p90 9 | **Lowest — invented** |
| AI calls per job | 3–9 | Medium |
| Token envelope | 900–2200 in, 150–600 out, gpt-4o-mini | Medium — priced off `config('ai.pricing')` |
| Failed/moderated calls | 2% | Low, immaterial |
| Infra | $40/mo default, $15/mo modelled (`--infra=`) | Low |
| Stripe | 2.9% + 30c | High — published rate |

Conversion moves almost entirely with activation rate and the jobs distribution, and both
are guesses. Treat every finding above as a hypothesis to test, not a result.

## Two seeder bugs fixed on 2026-07-20

Both were found while sweeping scenarios, and both silently corrupted earlier runs:

1. **`ai_requests` leaked one full run per re-seed.** `ai_requests.user_id` is
   `nullOnDelete`, not `cascadeOnDelete` — deliberately, so a real user's cost history
   outlives the account. Correct for production, wrong for a fixture: deleting the sample
   users stranded ~119k rows with a NULL `user_id`, which `pricing:growth` still summed
   into AI cost. `clearPreviousRun()` now deletes them while the join still resolves. The
   first version of this document reported 0.32c/job only because the database happened to
   be clean; a second run read 0.64c.

2. **The env overrides were only half-wired**, so `GROWTH_JOB_CENTS=75` silently seeded at
   50c. All four spend sites now read the instance properties.

## Not modelled

Churn and reactivation, cover letters, seasonality, support cost, escheatment on the
deferred balance. Refunds *are* modelled — see the bounds section above.

**Price elasticity is the significant gap.** Every price arm above assumes job counts do
not respond to price. For a population the pricing doc describes as cash-constrained that
is almost certainly false, and it is exactly the assumption holding up the largest swing in
the tornado. It is left unmodelled deliberately rather than guessed at: inventing an
elasticity to sit on top of an invented distribution would produce a confident number with
nothing underneath it.
