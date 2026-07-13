# AI Strategy — Parked for Decision

Date: 2026-07-13. Status: **decided and implemented — see "Outcome" at the bottom.**

## Context

AI is currently suspended site-wide (`AI_ENABLED=false`, gated by the `ai_enabled` middleware). Code is intact, not deleted.

Reason it was turned off (user's words): concern that users were clicking a button and having AI create everything for them, plus Reddit posts from recruiters who are tired of seeing the same AI-generated content and want originality.

## Existing AI surface (all built, all suspended)

| Feature | Route |
|---|---|
| Rewrite bullet | `POST /builder/{r}/ai/rewrite-bullet` |
| Generate summary | `.../ai/summary` |
| ATS keywords | `.../ai/ats-keywords` |
| Career map | `.../ai/career-map` |
| Translate resume | `.../ai/translate` |
| Interview coach | `.../interview-coach` |
| Career coach chat | `/career-coach` |
| Resignation letter gen | `/resignation-letters/{l}/generate` |

Deterministic (correctly NOT AI): strength score, salary hint, autocomplete, heatmap, proofreading.

## Feature assessment

**Keep / lead with:**
- **Rewrite bullet** — the killer feature. Cheap, scoped, user verifies in 2 seconds.
- **ATS keywords / JD tailoring** — real pain, real differentiation, the thing people pay for.
- **Interview coach** — genuine judgment task, hard to fake with code.

**Keep but demote:**
- **Summary generation** — table stakes, every competitor has it. Don't market on it.
- **Cover letter generation** — biggest *gap*. No AI route exists today. Cover letters are the most AI-appropriate artifact in the app.

**Cut / don't re-enable:**
- **Translate** — needs domain nuance the model will quietly botch; nobody buys the product for it; highest cost per call (full resume in + full resume out).
- **Career map** — vague, unverifiable output. The "AI horoscope" feature: great demo, zero repeat use.
- **Resignation letter gen** — it's a 4-line letter. A template with 3 blanks does it better, instantly, for $0.
- **Career coach chat** — unbounded tokens, unbounded scope, users will ask it about visa law. If kept, hard-scope it to the user's resume.

## How competitors get AI wrong

1. **The chat box as a feature.** Nobody wants to converse with their resume builder; they want a button that fixes the bullet they're staring at.
2. **AI where code answers** (violates project Rule 5). Competitors run "ATS score" through an LLM and get a non-deterministic number that changes on refresh. Ours (`StrengthScoreController`) is deterministic. Do not "upgrade" it to AI.
3. **One-shot "generate my whole resume."** Produces a generic resume that gets rejected, and the user can't tell which part is the lie.
4. **Quota theatre.** Metering credits so aggressively that free users never experience the value, so they never convert.
5. **No provenance.** Users can't tell what AI wrote vs. what they wrote, and submit hallucinated metrics ("increased revenue 40%") they can't defend in an interview. This is the real liability in this space.

## Cost analysis (OpenAI vs Claude)

Per-million-token prices:

| Model | Input | Output |
|---|---|---|
| Claude Haiku 4.5 | $1.00 | $5.00 |
| Claude Sonnet 5 | $3.00 ($2 intro thru 2026-08-31) | $15.00 ($10 intro) |
| Claude Opus 4.8 | $5.00 | $25.00 |
| OpenAI mini/nano tier | ~$0.10–0.15 *(from memory — verify)* | ~$0.40–0.60 *(verify)* |

**Is Claude cheaper than OpenAI? No.** Haiku is ~6× the per-token price of OpenAI's small models.
**Does it matter? Almost certainly not.** A bullet rewrite is ~500 tokens in, 200 out:

- Haiku 4.5: **~$0.0015/rewrite.** A Starter user burning their *entire* 150-gen monthly quota costs **~$0.22** against $9 revenue.
- Opus 4.8: **~$0.0075/rewrite.** Same fully-exhausted quota costs **~$1.13** against $9.

Even on the most expensive Claude model, a user who exhausts their quota costs ~12% of their subscription. Nobody exhausts their quota. **Vendor choice is not the cost lever.**

**The actual cost lever is three specific features:**
1. **Translate** — full resume in + out, 10–20× the tokens of a bullet rewrite.
2. **Career coach chat** — unbounded length; every turn resends the whole history.
3. **Interview coach** — sends full experience + skills arrays on every call.

Kill translate, hard-scope or kill the chat, and the cost ceiling is set.

### Recommendation
- **Claude Haiku 4.5** for bulk work (bullet rewrite, summary, keyword extraction).
- **Claude Sonnet 5** for judgment-heavy calls (interview questions, resume critique).
- **Prompt caching**: put the stable preamble (instructions + resume context) first in the prompt. Cache reads cost ~10% of base input price — this closes most of the gap with OpenAI's cheap tier.
- Laravel 13 has a first-party AI SDK, so provider swap is config, not a rewrite. Not locked in either way.

## The strategic thesis (the important part)

The user's two concerns are the same concern:
> "I want users to use their own brains" + "recruiters are tired of AI-generated content"

If recruiters can spot AI-generated resumes and are rejecting them, **a resume builder whose AI generates the resume is actively harming its users.** That's a product defect, not a philosophical qualm.

**The move: flip the direction of the AI. Stop pointing it at the page; point it at the person.**

| Instead of AI that... | Build AI that... |
|---|---|
| Writes your bullet | Asks "what was the result?" and makes *you* answer |
| Generates your summary | Tells you your summary says nothing specific |
| Produces polished prose | Flags that your bullet has no number in it |
| Fills the blank | Interrogates the blank |

Example: user writes *"Responsible for managing the sales team."* Today's AI rewrites it into confident filler. Instead it returns: *"How many people? Over what period? Did revenue move — by how much?"* The user types the real answer. The resume is now in their voice, contains facts only they know, and reads like nothing else in the stack — **because it's true.**

This resolves all three concerns at once: **cheaper** (short critique output beats long generated prose), **more authentic**, and **defensible against recruiter fatigue** in a way better prompts never will be.

## Outcome — decided and implemented 2026-07-13

The 3 open questions are answered:

1. **Critique vs. generation → both, at equal weight ("Option C").** The bullet editor shows "🎯 Coach me" and "✨ Write it for me" side by side, no nudge either way. The recommendation was coach-primary, on the grounds that an easy button next to a hard button gets pressed every time; the user chose true 50/50 knowingly. **If the coach sees little use, this is the first thing to revisit.**

2. **Re-enable + evolve, not rebuild.** `critique_bullet` was added as a new prompt arm and controller method reusing the existing private `run()` helper, so quota/moderation/error handling came free. Translate, career map, and resignation-letter generation were deleted outright. Cover letters are still unwired — note `AiPrompts::coverLetter()` **already exists**, contrary to the "biggest gap" framing above; only the route is missing.

3. **Historical cost numbers: unavailable.** `ai_requests` is empty (0 rows) on local. If AI ever ran in production the rows are on the production DB, which this session couldn't reach. The estimate above stands and its conclusion is unchanged: vendor choice is not the cost lever.

**Still open:** production `.env` needs `AI_ENABLED=true` + `AI_CAREER_COACH_ENABLED=false`; free-tier AI quota is **0**, so free users cannot use the coach at all (`config/ai.php`) — that likely defeats the coach as a conversion hook; career coach chat is dark behind its own flag pending a hard-scope-or-delete call.
