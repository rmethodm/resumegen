# AI Lockdown — Moderation + Attribution + Token Cap (design)

Date: 2026-06-13
Status: approved design, pending spec review

## Problem

`AiService::chat()` sends user-supplied text straight to OpenAI with no content
pre-check, no per-user attribution, and no completion-token cap. Risks: a
content-policy ban on the whole API key from one abusive user, and unbounded cost
per call. Goal: protect the key with **zero new deps and zero new tables** — all
changes live in `AiService`, one new exception class, and one config key.

## Decision: core trio A + B + C

### A — Moderation pre-check
Before the chat call, send the prompt text to OpenAI's free moderations endpoint
(`$this->client->moderations()->create([...])`, same injected `ClientContract`).
If any result is `flagged === true`:
- log an `AiRequest` row with `status = 'flagged'` (zero tokens),
- throw a typed `App\Exceptions\ModerationException`,
- **do not** call `chat()`.

Because `aiRequestsThisMonth()` counts only `status = 'success'`, flagged calls
never consume quota — no quota-logic change needed.

### B — User identifier
Add `'user' => $user ? 'user_'.$user->id : 'guest'` to **both** the moderation and
chat payloads, so OpenAI attributes any abuse to one account, not the whole key.

### C — Completion-token cap
Add `'max_tokens' => config('ai.max_completion_tokens', 1000)` to the chat payload.
New config key, **default 1000** (not the doc's 500: the rewrite-bullet feature now
accepts up to 8000 chars of multi-line input and its output can exceed 500
completion tokens — 500 would truncate long rewrites).

## Flow

```
controller → AiService::chat(prompt, {user, feature})
 ├─ moderate(prompt, user)
 │    └─ flagged? → log 'flagged' → throw ModerationException ─┐
 ├─ client->chat()->create({..., user, max_tokens})           │
 │    └─ log 'success' → return text                          │
 └─ on other Throwable → log 'error' → rethrow → 503           │
                                                               ▼
ModerationException::render() → 422 { error: "This content can't be processed." }
```

## Implementation surface

1. **`app/Exceptions/ModerationException.php`** — extends `\Exception`, has a
   `render($request)` method returning
   `response()->json(['error' => "This content can't be processed."], 422)`.
   Using `render()` means no controller needs a try/catch — Laravel's handler
   invokes it automatically for both web-XHR and API routes (the AI buttons use
   `fetch`, so a JSON 422 is correct for both layers).
2. **`config/ai.php`** — add `'max_completion_tokens' => 1000`.
3. **`app/Services/AiService.php`**:
   - New `private function moderate(string $text, ?User $user): void` — calls
     `$this->client->moderations()->create(['input' => $text, 'user' => $this->userId($user)])`;
     if flagged, `$this->log($user, $feature, $model, 0, 0, 0, 'flagged')` then
     `throw new ModerationException`. (Pass `$feature`/`$model` through, or inline
     the log — keep it one private helper.)
   - New `private function userId(?User $user): string` → `'user_'.$user->id` or `'guest'`.
   - `chat()` calls `moderate()` first (outside the existing try, or inside before
     the chat call), then adds `'user'` and `'max_tokens'` to the chat payload.
   - The existing `catch (Throwable)` must **not** swallow `ModerationException`:
     either call `moderate()` before the try block, or rethrow `ModerationException`
     untouched. Preferred: moderate before the try so the 'error' path stays purely
     for chat failures.

## Testing

Extend `tests/Feature/` AI tests using `OpenAI::fake([...])`:
- **Flagged input**: stub a moderation result with `flagged => true`. Assert
  `ModerationException` thrown, an `AiRequest` row with `status = 'flagged'` exists,
  and `chat()->create` was **never** called (assert via fake's recorded requests).
- **Clean input**: stub clean moderation + a completion. Assert the chat payload
  contains `user => 'user_{id}'` and `max_tokens => 1000`, and a `status = 'success'`
  row is logged.
- **End-to-end** (`AiSuggestionTest`): flagged input → HTTP **422** with the error
  message, and the user's monthly quota is unchanged (no `success` row).

## Out of scope

- No new moderation tables, no async/queued moderation, no per-category thresholds
  (binary `flagged` only).
- No rate-limit changes (existing `throttle` on AI routes is unchanged).
- Pricing/quota numbers are owned by the repricing spec, not this one.
