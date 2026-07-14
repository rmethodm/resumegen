# Pricing Structure Review

_Reviewed against source of truth: `app/Services/UserLimits.php`, `config/ai.php`,
`config/services.php`, `resources/js/Pages/Billing/Index.tsx` — 2026-07-12._

## What's actually shipping today

| | Free | Starter $9 / $84yr | Pro $19 / $178yr | Agency $49 / $459yr |
|---|---|---|---|---|
| Resumes | 2 | 10 | ∞ | ∞ |
| Cover letters | 2 | 10 | ∞ | ∞ |
| Resignation letters | 1 | 10 | ∞ | ∞ |
| Job applications | 3 | ∞ | ∞ | ∞ |
| Templates | **all 9** | all 9 | all 9 | all 9 |
| DOCX export | **✓** | ✓ | ✓ | ✓ |
| Custom sections | 2 | ∞ | ∞ | ∞ |
| AI generations/mo | **0** | 150 | 500 | 1000 |
| ATS / tailoring / translate | ✗ | ✓ | ✓ | ✓ |
| Interview coach | 3/mo | ∞ | ∞ | ∞ |
| Career coach / map | ✗ | ✗ | ✓ | ✓ |
| API access | ✗ | ✗ | ✓ | ✓ |
| Team workspace | ✗ | ✗ | ✗ | ✓ |
| One-time proofreading | $49 add-on, any tier | | | |

## The one problem that dominates all others

**AI is globally suspended** (`AI_ENABLED` off). Every real differentiator above the
volume caps is AI: generations, ATS scoring, tailoring, translate, career coach,
career map. With AI off:

- Starter's headline value ("ATS scoring", "150 AI generations") is dead copy pointing
  at disabled features.
- Pro over Starter collapses to **unlimited counts + API access** (career coach is AI, off).
- Agency over Pro collapses to **team workspace only**, at 2.5×.

Decide the AI question first — re-enable, or re-price the tiers around what works today.

## Structural issues (independent of AI)

1. **Free tier gives away both classic conversion levers.** All 9 templates *and* DOCX
   export are free (code overrides the CLAUDE.md table, which still says 4 templates /
   DOCX = Starter+). With AI also off, a free user gets essentially the whole product
   minus volume caps.
2. **The ladder is almost pure volume.** Free→Starter→Pro is "how many resumes/cover
   letters" + AI quota. Resume volume is a weak willingness-to-pay axis.
3. **Agency is thin.** $49 vs Pro's $19 buys only team workspace + 2× AI quota.
4. **Doc drift.** CLAUDE.md's pricing table is wrong on templates, DOCX, and free AI
   quota (says 10, code says 0).
5. Annual discount is consistent at ~22% across all three tiers — no issue.

## Suggested changes (priority order)

1. **Resolve AI.** If re-enabling soon, fix the free AI quota messaging (0 vs marketed
   10). If AI stays off, strip AI copy from Billing and re-price around non-AI value.
2. **Restore a non-AI conversion lever.** Re-gate templates (e.g. 4 free, rest Starter+)
   or DOCX export to paid — right now nothing pushes free→paid except the 2-resume cap.
3. **Consider job-search packaging over volume tiers** — a time-boxed "one active job
   search" bundle (tailoring + ATS + interview coach) converts better than volume caps.
   Bigger change; brainstorm separately.
4. **Fix CLAUDE.md** to match `UserLimits`.
