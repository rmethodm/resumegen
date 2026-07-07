# AI Lockdown — Moderation, User Attribution, Token Cap

**Date:** 2026-06-12
**Status:** Approved design
**Scope:** Protect the OpenAI key from content-based bans and cost runaway. No new dependencies, no new tables.

## Problem

The three AI routes (`builder.ai.rewrite-bullet`, `builder.ai.summary`, `builder.ai.ats-keywords`) and the API `ai-suggest` route forward user-supplied text straight to OpenAI's chat completions endpoint. Today there is:

- **No moderation** — arbitrary text (up to 8000 chars for `rewrite-bullet`) reaches OpenAI. Disallowed content can flag or ban the org-level API key.
- **No user attribution** — `AiService` never sends OpenAI's `user` field, so abuse is attributed to the whole org rather than one account, widening the ban blast radius.
- **No completion cap** — no `max_tokens`, allowing long/expensive outputs.

Existing protections (kept, unchanged): auth + `ResumePolicy` gating, `throttle:20,1` on the web AI group, monthly per-tier quota via `UserLimits::canUseAi`, and `ai_requests` cost logging.

## Design

All changes live in `App\Services\AiService` plus one config key and one new exception. The controller (`AiSuggestionController`) maps the new exception to a 422.

### A — Moderation pre-check

Before each `chat()` call, send the user-supplied text to OpenAI's free moderation endpoint via the already-injected client:

```php
$result = $this->client->moderations()->create([
    'input' => $text,
    'user'  => $this->userTag($user),
]);

if ($result->results[0]->flagged) {
    $this->log($user, $feature, $model, 0, 0, 0, 'flagged');
    throw new ModerationException();
}
```

- `chat()` gains a way to know which part of the prompt is user-supplied. The simplest seam: add an optional `'moderate' => string` key to the `$options` array. The controller passes the raw user text (the bullet text, or a concatenation of experience/skills/role) so moderation scans user input, not the templated prompt scaffolding. When `moderate` is absent or empty, the moderation call is skipped.
- A `flagged` row is written to `ai_requests` (token counts 0, `status = 'flagged'`). It does **not** count toward quota — `UserLimits::aiRequestsThisMonth` only counts `status = 'success'`, so no change needed there.
- Moderation runs **after** the quota gate (already in the controller) and **before** the chat call. A flagged request never reaches chat completions.

### B — User identifier

A private helper produces a stable per-user tag:

```php
private function userTag(?User $user): string
{
    return $user ? 'user_'.$user->id : 'guest';
}
```

This tag is added to both the moderation payload and the chat payload (`'user' => $this->userTag($user)`). OpenAI uses it to attribute abuse to a single account.

### C — Completion token cap

Add to the chat payload:

```php
'max_tokens' => config('ai.max_completion_tokens', 500),
```

New config key in `config/ai.php`:

```php
'max_completion_tokens' => env('OPENAI_MAX_COMPLETION_TOKENS', 500),
```

### New exception

`App\Exceptions\ModerationException` — a plain exception. The controller catches it (distinct from the generic `Throwable` 503 path) and returns:

```
HTTP 422  { "error": "This content can't be processed." }
```

Quota is unchanged on a flagged request (only `success` rows count).

## Flow

```
AiSuggestionController::run()
  ├─ quota gate (UserLimits::canUseAi) → 402 if exceeded   [existing]
  ├─ AiService::chat(prompt, { user, feature, moderate: <user text> })
  │     ├─ moderate(moderate, user) → flagged? log 'flagged', throw ModerationException
  │     ├─ chat(model, messages, user, max_tokens) → log 'success', return reply
  │     └─ on other Throwable → log 'error', rethrow
  ├─ catch ModerationException → 422 { error }
  └─ catch Throwable → report + 503 { error }   [existing]
```

## Files touched

- `app/Services/AiService.php` — add `userTag()`, moderation pre-check, `user` + `max_tokens` on the chat payload, `'flagged'` log status.
- `app/Exceptions/ModerationException.php` — new, plain exception.
- `config/ai.php` — add `max_completion_tokens`.
- `app/Http/Controllers/AiSuggestionController.php` — pass `moderate` text per feature; catch `ModerationException` → 422.
- `tests/Feature/AiServiceTest.php` — moderation fake cases.
- `tests/Feature/AiSuggestionTest.php` — flagged-input → 422, quota unchanged.

The per-feature `moderate` text:
- `rewrite_bullet` → the `text` field.
- `generate_summary` → concatenated experience + skills strings.
- `ats_keywords` → role + concatenated experience + skills strings.

## Testing

Using the SDK's `OpenAI::fake([...])`:

1. **Flagged input** — fake moderation returns `flagged = true`. Assert `chat()` throws `ModerationException`, a `flagged` `ai_requests` row exists, and the chat completion endpoint was never called.
2. **Clean input** — fake moderation returns `flagged = false` + a completion. Assert the chat request payload contains `user` (= `user_{id}`) and `max_tokens` (= configured value), and a `success` row is logged.
3. **Controller flagged path** (`AiSuggestionTest`) — POST flagged text to `builder.ai.rewrite-bullet` → 422, and `aiRequestsThisMonth` (success count) is unchanged.

## Out of scope (deferred)

- **D** — per-feature input tightening beyond current `max:` rules.
- **E** — stricter rate limits (current `throttle:20,1` retained).
- Any pricing/tier changes (tracked separately; diagnosis only at this time).
