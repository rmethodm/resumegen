# AI Abuse Safeguards — Design Spec

**Date:** 2026-06-05
**Status:** Approved

## Overview

Add three backend-only safeguard layers to the AI suggest and job tailoring endpoints to prevent prompt injection, content abuse, and excessive input. Per-user monthly caps (Layer 4) and Claude's built-in safety (Layer 6) are already in place. Email verification enforcement (Layer 5) is intentionally deferred.

## Layers in Scope

### Layer 1 — Prompt Delimiters

Wrap every user-supplied value in `<user_content>` XML tags before injection into the AI prompt. This signals to the model that the enclosed text is data, not instructions, preventing prompt injection.

**Files changed:**
- `AiSuggestController::buildPrompt()` — wrap `title`, `company`, `summary`, `bullets`, and each skill value
- `TailorController` — wrap `$jd` (job description) and the resume text sections in `buildResumeText()`

Example before:
```
Job title: {$context['title']}
```
Example after:
```
Job title: <user_content>{$context['title']}</user_content>
```

### Layer 2 — `AbuseFilter` Service

New `App\Services\AbuseFilter` with a single static method:

```php
public static function check(string $text): bool
```

Returns `true` if the text matches any blocked pattern. Both controllers call this on every user-supplied string before the API call. On match, return `422` with `{ "error": "Content policy violation" }` — no API token is spent.

**Blocked patterns (case-insensitive regex):**
- `ignore (previous |all |above )?instructions`
- `pretend you (are|were)`
- `act as (a |an )?`
- `you are now`
- `jailbreak`
- `disregard your (training|guidelines|rules)`
- `forget (your |all )?(previous |prior )?(instructions|training|context)`

New file: `app/Services/AbuseFilter.php`

**Applied in:**
- `AiSuggestController::suggest()` — check `context.title`, `context.company`, `context.summary`, `context.bullets`, and each skill string
- `TailorController::tailor()` — check `job_description`

### Layer 3 — Field-Length Caps

Add `max:` validation rules to `AiSuggestController::suggest()`. These are enforced server-side before any abuse check or API call.

| Field | Max |
|---|---|
| `context.title` | 100 chars |
| `context.company` | 150 chars |
| `context.summary` | 1,500 chars |
| `context.bullets` | 1,500 chars |
| Each skill string | 50 chars |
| Skills array | 50 items |

`TailorController` already has `min:50, max:5000` on `job_description` — no change needed.

## Error Responses

| Violation | HTTP | Body |
|---|---|---|
| Field too long | 422 | Laravel validation JSON |
| Blocked phrase | 422 | `{ "error": "Content policy violation" }` |

## Testing

- `tests/Unit/AbuseFilterTest.php` — unit tests: each blocked pattern matches, clean text passes, case-insensitivity, partial word non-match (e.g. "react as" should not match "act as")
- `tests/Feature/AiSuggestTest.php` — new cases: field over max length returns 422, blocked phrase in title returns 422
- `tests/Feature/TailorTest.php` — new case: blocked phrase in job description returns 422

## Out of Scope

- Email verification enforcement on AI routes (deferred)
- Output content scanning
- OpenAI Moderation API
- Frontend changes
