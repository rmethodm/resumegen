# Resume Builder — Visual Polish & AI Writing Assistant

**Date:** 2026-05-26
**Approach:** Phased — Phase 1 (visual, no API dependency), then Phase 2 (AI layer)
**Restore point:** git tag `pre-redesign-backup`

---

## Goals

1. Make the public resume view feel like a polished, distinctive document that stands out to employers.
2. Add inline AI writing assistance in the editor so content sounds professional without manual effort.

---

## Phase 1 — Visual Polish

### 1.1 Minimal Ruled Template

Add a new `'minimal-ruled'` value to the `ResumeTemplate` union type. This becomes the 4th template option alongside `classic`, `modern`, and `minimal` (monospace).

**Visual specification:**
- Page background: `#fafafa`, resume card: white with `shadow-lg`
- Name: large (`text-3xl`), `font-light`, wide letter-spacing (`tracking-widest`), uppercase
- Subtitle line below name: first experience job title + company in small gray uppercase (`text-xs text-gray-400 tracking-widest uppercase`)
- Contact info: single line, items separated by ` · `, `text-xs text-gray-500`
- Section labels: `text-[10px] font-bold uppercase tracking-widest text-gray-400`, flush left, no border/rule — spacing does the visual work
- Layout for Experience: two-column — narrow left column (fixed `w-16`) for dates (`text-xs text-gray-400 text-right`), flex-1 right column for content
- Skills: small pill tags (`bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full`) in a flex-wrap row, not bullet-separated text
- Certifications: same two-column date/content layout as experience
- Generous vertical spacing between sections (`mb-8`)

### 1.2 Public View Redesign (`PublicView.tsx`)

The public view (`/r/{token}`) is rebuilt to always render the Minimal Ruled layout, regardless of the resume's saved template. This is the employer-facing view and should always look its best.

- Apply the Minimal Ruled visual spec above
- Page wrapper: `min-h-screen bg-gray-50 py-10`
- Resume card: `mx-auto max-w-[8.5in] bg-white shadow-lg px-[0.75in] py-[0.75in]`

**Contact form elevation:**
- Wrapped in a card with `border-l-4 border-indigo-400 bg-indigo-50 rounded-r-lg p-6 mt-12`
- Headline: "Interested in this candidate? Reach out directly."
- Fields: lighter styling matching the Minimal Ruled aesthetic
- Submit button: `bg-indigo-600 text-white px-6 py-2.5 rounded-md shadow-sm hover:bg-indigo-500 font-medium`
- Success state: green checkmark icon card, not plain text

### 1.3 Editor Preview (`Edit.tsx` right panel)

The live preview panel renders Minimal Ruled when `template === 'minimal-ruled'`. The template select dropdown gets a 4th option: `<option value="minimal-ruled">Minimal Ruled</option>`.

### 1.4 Editor Left Panel Polish

- Section header buttons: add `border-l-2 border-indigo-300` left accent, remove flat gray background → use `bg-white hover:bg-gray-50`
- Field labels: `text-gray-600` (up from `text-gray-500`)
- "Add Position / Add School / Add Cert" buttons: replace dashed border style with `bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100 rounded-md`
- Drag handle: replace `⠿` character with a proper SVG grip icon (6 dots, 2×3 grid)
- Save indicator: saving state shows a small animated pulse dot (`animate-pulse text-amber-500`), saved state shows `text-green-500` with a checkmark
- Left panel background: `bg-gray-50` (was `bg-white`)

### 1.5 Data / Backend Changes for Phase 1

- `ResumeTemplate` TypeScript union: add `'minimal-ruled'`
- `ResumeBuilderController`: no validation change needed — template is stored as a string, `'minimal-ruled'` passes through automatically
- No migration needed — `template` column already exists as a string

---

## Phase 2 — AI Writing Assistant

### 2.1 Backend: `AiSuggestController`

New route: `POST /builder/{resume}/ai-suggest` (authenticated, behind `ResumePolicy`)

**Request:**
```json
{
  "field": "summary" | "bullets" | "skills" | "title",
  "context": {
    "summary": "...",
    "title": "...",
    "company": "...",
    "bullets": "...",
    "skills": ["..."]
  },
  "provider": "claude" | "openai"
}
```

**Response:**
```json
{ "suggestions": ["...", "...", "..."] }
```

**Logic:**
- Reads `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` from env based on `provider`
- If the key is missing, returns `422 { "error": "API key not configured" }`
- Rate limited: 10 requests/minute per authenticated user (Laravel `throttle:10,1` middleware)
- Uses a consistent system prompt: *"You are a professional resume writer. Return exactly 3 concise, achievement-oriented suggestions. Respond with a JSON array of strings only."*
- Claude: uses `claude-sonnet-4-6`, `max_tokens: 400`
- OpenAI: uses `gpt-4o`, `max_tokens: 400`
- Suggestions are returned as a plain JSON array — no markdown, no explanations

**Files:**
- `app/Http/Controllers/AiSuggestController.php` (new)
- `routes/web.php` — add `POST /builder/{resume}/ai-suggest`

### 2.2 Frontend: `AISuggestButton` Component

New file: `resources/js/Components/AISuggestButton.tsx`

**Props:**
```ts
interface Props {
  field: 'summary' | 'bullets' | 'skills' | 'title';
  context: Partial<AISuggestContext>;
  resumeId: number;
  provider: 'claude' | 'openai';
  onAccept: (suggestion: string) => void;
  buttonLabel?: string;
}
```

**States:** `idle → loading → open(suggestions) | error`

**Rendered output:**
- A small `✦ Suggest` button (or icon for inline fields)
- While loading: spinner replaces the `✦`
- When open: a popover card drops below the trigger, showing 2–3 suggestion cards, each with a "Use this" button and a "Try again" link at the bottom
- Clicking "Use this" calls `onAccept(suggestion)` and closes the popover
- Clicking outside or pressing `Escape` closes the popover
- Error state: inline `text-red-500 text-xs` message below the button

### 2.3 Provider Toggle in Editor Header

A small two-button toggle (`Claude | OpenAI`) added to the editor header bar, next to the template selector.

- Persists selection in `localStorage` key `resumegen_ai_provider`
- If neither key is configured (detected via `aiCapabilities: { claude: bool, openai: bool }` passed as an Inertia prop from `ResumeBuilderController::edit()`), the toggle is hidden and `✦` buttons show a tooltip: *"Add ANTHROPIC_API_KEY or OPENAI_API_KEY to .env to enable AI suggestions."*

### 2.4 AI Buttons Placement in `Edit.tsx`

| Field | Button placement | `onAccept` action |
|---|---|---|
| Summary textarea | Top-right corner of textarea wrapper, small `✦ Suggest` button | `setSummary(v); save()` |
| Each experience bullet set | Top-right of `BulletEditor` wrapper | `updateExp(id, 'bullets', v); save()` |
| Skills | Below `TagInput`, full `✦ Suggest skills` button | Appends suggestions as new tags via `setSkills` |
| Job title input | Right edge of title `Field`, small icon button | `updateExp(id, 'title', v); save()` |

### 2.5 Environment Variables

Add to `.env.example`:
```
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
```

---

## Files Changed Summary

**Phase 1:**
- `resources/js/types/index.d.ts` — add `'minimal-ruled'` to `ResumeTemplate`
- `resources/js/Pages/ResumeBuilder/Edit.tsx` — new template option, left panel polish, preview renders minimal-ruled
- `resources/js/Pages/ResumeBuilder/PublicView.tsx` — full Minimal Ruled redesign + elevated contact form

**Phase 2:**
- `app/Http/Controllers/AiSuggestController.php` (new)
- `routes/web.php` — new route
- `resources/js/Components/AISuggestButton.tsx` (new)
- `resources/js/Pages/ResumeBuilder/Edit.tsx` — provider toggle + AI buttons on 4 fields
- `.env.example` — two new keys

---

## Success Criteria

**Phase 1:**
- Public view at `/r/{token}` renders Minimal Ruled layout correctly with all sections
- `minimal-ruled` appears in the template dropdown and renders correctly in the live preview
- Editor left panel visually improved (accent borders, better buttons, proper drag handle)
- No regressions on save behavior, PDF download, share links, or questions inbox

**Phase 2:**
- `POST /builder/{resume}/ai-suggest` returns 3 suggestions for each field type using both providers
- Missing API key returns 422 with a clear message
- Rate limiting prevents more than 10 req/min per user
- `✦ Suggest` buttons appear on Summary, bullets, skills, and job title
- Accepting a suggestion updates the field and triggers save
- Provider toggle persists across page reloads
