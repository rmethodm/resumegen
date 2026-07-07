# AI Cost Risk Plan — Resumegen Free Tier

**Date:** 2026-06-16  
**Status:** Audit complete, safe to launch  
**Owner:** rmethodm  

## Executive Summary

Comprehensive audit of Resumegen's free-tier AI cost exposure. **Finding: Negligible risk.** AI costs are 1.89% of revenue even in worst-case scenarios. No scenario at 75 users produces losses.

---

## Current State

**AI Features (Free-Tier Accessible):**
- Rewrite Bullet: 10 calls/month limit
- Generate Summary: 10 calls/month limit
- ATS Keywords: **Starter+ only** (gated)
- Strength Score: unlimited (read-only, non-AI)

**Pricing Model:**
- Free: 10 AI calls/month
- Starter: 150 calls/month ($9/mo)
- Pro: 500 calls/month ($19/mo)
- Agency: 1000 calls/month ($49/mo)

**Cost:** 0.1¢ per call (gpt-4o-mini)

**Enforcement:** Server-side quota tracking in `ai_requests` table. Returns HTTP 402 if exceeded.

---

## 75-User Scenario (50 free, 25 Starter)

| Scenario | Free Calls | Starter Calls | AI Cost | Revenue | Cost % | Status |
|---|---|---|---|---|---|---|
| Light (3–30) | 150 | 750 | $0.90 | $225 | 0.40% | ✅ |
| Moderate (8–100) | 400 | 2,500 | $2.90 | $225 | 1.29% | ✅ |
| Heavy (10–150) | 500 | 3,750 | $4.25 | $225 | 1.89% | ✅ |
| Pathological (50% power) | 425 | 3,400 | $3.40 | $225 | 1.51% | ✅ |
| Gaming (5 fake accts) | 550 | 3,750 | $4.30 | $225 | 1.91% | ✅ |

**None produce losses.** Worst case: $4.30/month cost, $225/month revenue.

---

## What Would Cause Losses?

### Scale Scenarios

**10,000 free users** (1,000 Starter)
- Free calls: 50,000 @ 5 avg = $50/mo
- Starter calls: 150,000 @ 150 avg = $150/mo
- **Total: $200/mo | Revenue: $9,000/mo | Margin: 97.8% ✅**

**100,000 free users** (10,000 Starter)
- Free calls: 500,000 @ 5 avg = $500/mo
- Starter calls: 1,500,000 @ 150 avg = $1,500/mo
- **Total: $2,000/mo | Revenue: $90,000/mo | Margin: 97.8% ✅**

**Conclusion:** Scale does NOT cause losses. Revenue grows faster than cost.

### Model Change Scenarios

**If upgraded to GPT-4** ($2.50/call):
- 75-user heavy scenario: $106.25/mo (vs. $4.25) — 25× worse
- Still only 0.5% of revenue, but noticeable cost increase

**If added 5 more AI features** (without new quotas):
- Exposure multiplies by 5–10×
- At 5× multiplier: $21.25/mo worst case (still 9.5% of revenue)

### Enforcement Failures

**If quota is client-side only:**
- Power user could burn $50/mo in a single session
- Risk: low (app currently server-side enforces)

---

## Gaming Vectors & Risk Assessment

| Attack | Likelihood | Cost to Attacker | Impact @ 75 users | Impact @ 10k users | Mitigation |
|---|---|---|---|---|---|
| Multi-account farming | **HIGH** | $0 (temp email) | $0.05 | $50 | Email verification (1 day) |
| Rapid API calls | LOW | $0 | $0 | $0 | Rate limiting (exists) |
| Batch resume processing | N/A | N/A | $0 | $0 | Quota applies globally |
| Support appeal loops | LOW | 2 min | $0 | $0 | No reset mechanism |

**Primary Risk:** Multi-account farming becomes noticeable at 2k+ users. Easily fixed with email verification.

---

## Action Items (Prioritized)

### P1: Email Verification (Before 2,000 users)
- **Effort:** 1 day
- **Blocks:** Multi-account farming
- **Status:** Not yet implemented
- **Trigger:** When approaching 2k signups

### P2: IP Velocity Check (Before 2,000 users)
- **Effort:** 2 days
- **Blocks:** Coordinated attacks (5+ accounts/IP/24h)
- **Status:** Not yet implemented
- **Trigger:** When approaching 2k signups

### P3: AI Cost Monitoring Dashboard
- **Effort:** 4 hours
- **Value:** Early warning if actual usage diverges from projections
- **Status:** Not yet implemented
- **Trigger:** Before launch (when you have paying users)

### P4: Support Documentation
- **Effort:** 2 hours
- **Content:** Quota reset policy, why limits exist, upgrade benefit
- **Status:** Not yet implemented
- **Trigger:** Before launch

---

## Competitor Benchmarks

Scanned: Rezi, FlowCV, Copy.ai, Jasper, ChatGPT

| Platform | Free Limit | Type | Enforcement |
|---|---|---|---|
| **Rezi** | 1 free resume | Per-count | Server |
| **FlowCV** | 5 AI suggestions/mo | Monthly quota | Server |
| **Copy.ai** | 2,000 words/mo | Token budget | Server |
| **Jasper** | 10,000 words/mo | Token budget | Server |
| **ChatGPT** | Rate-limited | Rate-based | Server |

**Conclusion:** Resumegen's 10 calls/month is **industry-standard conservative**. No advantage to tightening.

---

## Recommendation: GREEN LIGHT

✅ **Safe to launch free tier at current AI cost exposure.**

**Rationale:**
- AI cost is negligible (max 1.89% of revenue at 75 users)
- Primary attack vector (multi-account farming) doesn't matter until 2k+ users
- Pricing model strongly incentivizes conversion (10 free vs. 150 for $9/mo)
- Competitors use same or more generous limits

**Do not over-engineer safeguards.** Implement email verification when you hit 1,500 users; it's a one-day lift. Until then, cost is irrelevant.

---

## Next Steps

1. **Track actual usage patterns** once you have real users (will inform future quota adjustments)
2. **Set up monitoring** (4-hour task) before going public
3. **Implement email verification** when approaching 2k signups (1-day task)
4. **Re-audit in 6 months** if usage diverges from projections

---

## Related Documents

- `AI_COST_EXPOSURE_AUDIT.md` (full 20KB audit report with all details)
- `CLAUDE.md` → "AI (OpenAI)" section (config, routes, quota system)
- `config/ai.php` (limits and pricing)
- `app/Services/UserLimits.php` (quota enforcement)

---

**Plan Status:** Ready for implementation  
**Last Updated:** 2026-06-16
