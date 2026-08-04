# AI provider comparison — Resumegen (2026-08)

> Advisory only. AI is not live; this does not choose a vendor for production.
> Complements `docs/ai-reintroduction-map.md` and `docs/pricing-recommendations-2026-08.md`.
> Pricing snapshot: **2026-08** from official provider docs (rates change; re-check before implementation).

---

## Bottom line

| Question | Answer |
|---|---|
| **Cheapest for Tier 1 volume?** | **OpenAI (ChatGPT API)** — mini/nano family |
| **Often best professional prose?** | **Claude** (Haiku → Sonnet) |
| **Best overall for this app?** | **OpenAI mini/nano as default**; Claude optional paid quality tier |
| **Grok?** | Fine API, **not** best or cheapest for high-frequency bullet/summary work |

**Ship pick for a vertical slice:** OpenAI `gpt-4o-mini` or `gpt-5-nano`, with a short bake-off vs Claude Haiku 4.5 on real bullets before multi-provider work.

---

## What Resumegen actually needs

From the AI reintroduction map, Tier 1 is mostly:

| Action | Shape | Cost driver |
|---|---|---|
| Bullet rewrite | Short in, short out, many times | **Price × volume** |
| Summary draft / tailor | Medium out | Price + quality |
| JD / keyword scan | More input, structured out | Prefer **deterministic** first; LLM only for gap narrative |

Target profile: **fast, cheap, good-enough professional English** — not agentic coding or long-context research.

---

## Price comparison (relevant models)

Rates are **USD per 1M tokens**, standard realtime (not batch/priority/fast mode).

| Provider | Model | Input / 1M | Output / 1M | Role for Resumegen |
|---|---|---|---|---|
| **OpenAI** | `gpt-5-nano` | **$0.05** | **$0.40** | Floor price |
| **OpenAI** | `gpt-4o-mini` | **$0.15** | **$0.60** | Proven cheap default |
| **OpenAI** | `gpt-5-mini` | $0.25 | $2.00 | Better quality, still cheap |
| **OpenAI** | `gpt-5.4-nano` | $0.20 | $1.25 | Mid “small” tier |
| **Claude** | Haiku 4.5 | $1.00 | $5.00 | Fast Claude; still ~5–10× mini |
| **Claude** | Sonnet 5 (intro through 2026-08-31) | $2.00 | $10.00 | Strong writing; expensive for free quotas |
| **Claude** | Sonnet 5 (from 2026-09-01) | $3.00 | $15.00 | Post-intro list |
| **Grok (xAI)** | grok-4.3 | $1.25 | $2.50 | Mid-tier; no ultra-budget SKU on official list at snapshot |
| **Grok (xAI)** | grok-4.5 | $2.00 | $6.00 | Flagship; overkill & pricey for bullets |

### Sources (verify before implement)

- OpenAI: https://developers.openai.com/api/docs/pricing
- Anthropic: https://platform.claude.com/docs/en/about-claude/pricing
- xAI: https://docs.x.ai/developers/pricing

---

## Rough cost per bullet rewrite

Assumption: ~**800 input + 150 output** tokens (system prompt + one bullet + 2–3 options).

| Model | ≈ per rewrite |
|---|---|
| gpt-5-nano | **~$0.0001** |
| gpt-4o-mini | **~$0.0002** |
| Claude Haiku 4.5 | **~$0.0015** (~7–15× OpenAI mini) |
| Grok 4.3 | **~$0.0014** |
| Claude Sonnet 5 (intro) | **~$0.003** |

At free-tier scale (e.g. ~5 rewrites/user/month × thousands of users), **OpenAI mini/nano stays rounding-error COGS**. Haiku/Grok mid-tier becomes real cost if free AI is generous.

---

## Quality for *this* product (not general chat)

| Criterion | OpenAI mini/nano | Claude Haiku/Sonnet | Grok 4.3/4.5 |
|---|---|---|---|
| **Cost at high volume** | **Best** | Weak | Weak |
| **Resume / professional rewrite** | Good enough with tight prompts | **Often best tone & structure** | Solid; less of a “writing product” default |
| **Latency** | Excellent on mini | Haiku fast; Sonnet slower | Fine |
| **Laravel fit** | Strong history (openai-php was used pre-removal); large ecosystem | Anthropic SDK fine | OpenAI-compatible API (easy drop-in) |
| **Structured JSON (JD gaps)** | Strong | Strong | Strong |
| **Risk of fluff / hallucination** | Manageable with constraints | Usually careful | Can be punchy; still need hard rules |

Resume bullets are **constrained generation** (no inventing metrics, keep facts, one line, active voice). Quality gaps shrink with a strict system prompt + reject/regenerate — which favors **cheap models + good prompts** over **expensive models + loose prompts**.

---

## Recommendation for Resumegen

### 1. Default: OpenAI (ChatGPT API) — mini/nano

**Best balance of cheapest + good enough + product fit.**

- **Ship path:** `gpt-4o-mini` or `gpt-5-nano` for free-tier rewrites/summaries.
- **Paid upgrade path (optional):** `gpt-5-mini` or `gpt-5.4-mini` if free-tier quality feels thin.
- Matches “meter actions, not export” and keeps Free ~5 rewrites/mo economically safe (see AI map Free vs Paid matrix).

### 2. Claude if quality is the product

- **Haiku 4.5** for production volume if you insist on Claude brand/tone.
- **Sonnet** only for paid “premium rewrite” or hard edge cases — not free unlimited.
- Worth A/B: same 50 bullets through mini vs Haiku; only keep Claude if win rate justifies 5–15× cost.

### 3. Grok — only with a non-cost reason

- Official text lineup at snapshot sits at **~$1–2/M in, $2.50–6/M out** — same ballpark as Claude mid, **not** OpenAI mini.
- Good if you want OpenAI-compatible API + xAI stack preference.
- **Not** the cost winner for high-frequency bullet/summary APIs.

---

## Suggested runtime architecture (when approved)

```
Free tier  → OpenAI nano/mini  (strict prompt, short max_tokens)
Pro tier   → same model + higher quota
Optional   → Claude Haiku as “Premium rewrite” SKU (clear upsell)
Never      → Opus / Grok 4.5 / GPT-5.x flagship for default bullets
```

Operational rules:

1. **Cache** the system prompt (all three support cheaper cached input).
2. Cap **max_tokens** hard (e.g. 120–200 for a rewrite).
3. Keep **JD keyword overlap** deterministic first; only LLM for narrative gaps.
4. One abstraction (`AiClient` interface) so provider is swappable — don’t hard-lock product to one brand.

---

## Related docs

- `docs/ai-reintroduction-map.md` — where AI should live; Free vs Paid quotas
- `docs/pricing-recommendations-2026-08.md` — list prices; meter AI after AI exists
- CLAUDE.md — AI removed; reintroduce only with product decision

---

## Next steps (optional, not started)

1. Product approval before any provider keys or packages
2. Bullet-rewrite vertical slice on OpenAI mini/nano
3. Optional 50-bullet quality bake-off: mini vs Haiku 4.5
4. Re-check official rates on implement day (this file is a 2026-08 snapshot)
