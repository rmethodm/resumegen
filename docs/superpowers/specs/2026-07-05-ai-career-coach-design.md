# AI Career Coach — Design Spec

Date: 2026-07-05
Status: Approved for planning

## Problem

Competitive research against kickresume.com (`2026-07-05-kickresume-competitive-gap-analysis.md`)
identified "Career Map / AI Career Coach" as a gap. Career Map (one-shot suggestions) was designed
separately (`2026-07-05-career-map-design.md`); this spec covers the multi-turn conversational half,
deferred from that design because it needs genuinely new infrastructure — the app has no chat/message
persistence for AI conversations today (`ResumeThread` is visitor Q&A on shared resumes, unrelated).

## Goals

- A standalone, persistent chat with an AI career coach — one ongoing conversation per user.
- Ground advice in the user's actual background by including their most recently updated resume as
  context, without requiring them to re-explain it every session.
- Reuse existing AI infrastructure (quota gating, moderation, error handling) with the minimum
  necessary extension to support real multi-turn context.

## Non-goals

- Per-resume conversations or multiple simultaneous threads — one ongoing thread per user only.
- Unbounded conversation history sent to the model — capped at the last 20 messages to bound
  prompt size/cost as a conversation grows.
- Automatic resume edits from the conversation — the coach advises; it does not write back to any
  resume.

## Data model

**Migration:** `career_coach_messages` table:

| Column | Type | Notes |
|---|---|---|
| `id` | bigint PK | |
| `user_id` | FK → users, cascadeDelete | |
| `role` | string | `user` or `assistant` |
| `content` | text | |
| `created_at` | timestamp | append-only, `public const UPDATED_AT = null` |

**Model:** `App\Models\CareerCoachMessage` — `$fillable = ['user_id', 'role', 'content']`,
`user(): BelongsTo`. One thread per user — no separate conversation/thread grouping table, since
each user has exactly one ongoing conversation.

**`UserLimits::canCareerCoach(User $user): bool`**:
```php
return in_array($user->planTier(), ['pro', 'agency'], true);
```

## Backend

**`AiService::chat()` extension** — add an optional `$options['messages']`
(`array<{role: string, content: string}>`). When present, it replaces the default
`[['role' => 'user', 'content' => $prompt]]` array sent to OpenAI. `$prompt` is still required
(moderates the latest user message) but its content is otherwise ignored once `messages` is set.
Fully backward compatible: no existing caller (`rewrite_bullet`, `ats_keywords`, `interview_coach`,
etc.) passes `messages`, so their behavior is unchanged.

**`App\Http\Controllers\CareerCoachController`:**

- `index(Request $request): Response` — loads the user's messages ordered by `created_at`, renders
  `CareerCoach/Index.tsx` with `messages`, `canUseCareerCoach` (drives the locked-state UI),
  `remaining` (AI quota).
- `send(Request $request): JsonResponse`:
  1. Tier gate: `! UserLimits::canCareerCoach($user)` → 402
     `{ error: 'Career Coach is a Pro feature.', required_tier: 'pro' }`
  2. AI quota gate: `! UserLimits::canUseAi($user)` → 402, existing shape (same fields as
     `AiSuggestionController::run()`'s quota-exhausted response)
  3. Validate `message` (`required`, `string`, `max:2000`)
  4. Create the user's `CareerCoachMessage` (`role: 'user'`) immediately — it is saved regardless
     of whether the AI call below succeeds
  5. Load the last 20 messages (chronological order) including the one just created
  6. Pull `summary`/`experience`/`skills` from `$user->resumes()->latest('updated_at')->first()`
     (nullable fields if the user has no resumes)
  7. Call:
     ```php
     $this->ai->chat(
         $latestMessage->content,
         [
             'messages' => [
                 ['role' => 'system', 'content' => AiPrompts::build('career_coach', ['resume_context' => $resumeContext])],
                 ...$historyAsRoleContentArray,
             ],
             'user' => $user,
             'feature' => 'career_coach',
         ],
     );
     ```
  8. Catch `ModerationException` → 422 `ModerationException::USER_MESSAGE` — user message stays
     saved, no assistant message is created
  9. Catch `Throwable` → 503 `'AI is temporarily unavailable. Try again.'` — same: user message
     stays saved, no assistant message is created
  10. Store the assistant's reply as a new `CareerCoachMessage` (`role: 'assistant'`)
  11. Return `{ message: { role, content, created_at }, remaining: UserLimits::aiRemaining($user) }`

**Routes:**
```
GET  /career-coach             career-coach.index
POST /career-coach/messages    career-coach.send
```

**`AiPrompts::build('career_coach', ['resume_context' => [...]])`** — builds only the **system**
message: coach persona/tone instructions plus the resume context (or a note that none is available).
The conversation history itself is assembled directly in the controller as the `messages` array, not
inside `AiPrompts` — `AiPrompts` stays a pure prompt-string builder, consistent with every other
feature.

## Frontend

**`resources/js/Pages/CareerCoach/Index.tsx`** — same chat-bubble structure as
`ResumeBuilder/Thread.tsx`: message bubbles (right-aligned/indigo for `user`, left-aligned/white for
`assistant`), scroll-to-bottom on new message, textarea + Send form with ⌘+Enter to send. Uses
`useForm`/`post` to `career-coach.send`, appending the returned message to local state on success
(XHR-style append, not a full-page Inertia reload per message).

**Locked state:** Free/Starter users see a locked/upgrade state instead of the chat UI (consistent
with other Pro-gated features), with an upgrade CTA.

**Nav:** new "Career Coach" link in `AuthenticatedLayout.tsx` (desktop `NavLink` + mobile
`ResponsiveNavLink`), pointing at `route('career-coach.index')`.

## Error handling

- Free/Starter → 402 on both `index` (locked-state page) and `send`
  (`{ error, required_tier: 'pro' }`)
- Monthly AI quota exhausted → 402, existing shape. The user's message is already saved and shown;
  the UI shows the sent bubble plus an inline "couldn't get a reply, try again" note — no assistant
  bubble is rendered
- Moderation-flagged message → 422, same UI treatment as quota exhaustion
- AI service failure → 503, same treatment

## Testing

- `tests/Feature/CareerCoachTest.php`:
  - 402 for Free/Starter on both `index` and `send`
  - Successful send/reply round-trip for Pro/Agency — asserts both `CareerCoachMessage` rows
    (`user` and `assistant`) are created
  - History capped to the last 20 messages sent to the AI (assert the `messages` array length on a
    conversation with more than 20 prior messages)
  - 402 on AI quota exhaustion — asserts the user message is still persisted, no assistant message
    is created
  - 422 on moderation rejection — same persistence assertion
  - 503 on AI service failure — same persistence assertion
- Unit test for `AiService::chat()`'s `messages` option: asserts it overrides the default
  single-message array when present, and that omitting it preserves the existing single-prompt
  behavior (regression coverage protecting every other AI feature).
- Unit test in `tests/Unit/AiPromptsTest.php` for the new `career_coach` system-message-building
  branch.

## Rollout

No new external dependencies or env vars — reuses the existing `AiService`/OpenAI configuration and
the existing quota-accounting table (`ai_requests`, new `feature: 'career_coach'` value). The
`AiService::chat()` signature change is additive/backward-compatible, requiring no changes to
existing callers.
