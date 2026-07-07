# AI Undo Design

**Date:** 2026-06-17  
**Scope:** Resume builder — undo AI rewrites for summary, experience bullets, project bullets

## Problem

When a user clicks "Improve with AI" or "Generate with AI", the current field value is overwritten immediately with no way to recover the original text. One bad rewrite permanently loses what the user wrote.

## Solution

In-memory stash + toast + inline undo link. One level of undo per field, scoped to the last AI action. Lost on page refresh (acceptable — the DB already saved the AI version; the existing snapshot feature covers longer-term rollback).

## Data Structures

All changes confined to `resources/js/Pages/ResumeBuilder/Edit.tsx`.

```ts
// Stash of original values before AI overwrites — keyed by field
const prevAiValues = useRef<Map<string, string>>(new Map());

// Controls which fields show the inline ↩ link
const [aiUndoKeys, setAiUndoKeys] = useState<Set<string>>(new Set());

// Controls the toast
const [aiUndoToast, setAiUndoToast] = useState<{ key: string; label: string } | null>(null);
```

**Key format:**
- `'summary'` — summary textarea
- `'exp:{id}'` — experience entry bullets
- `'proj:{id}'` — project entry bullets

## Trigger Flow

When an AI result is applied:
1. `prevAiValues.current.set(key, originalValue)` — stash original
2. Apply AI value to state (unchanged from today)
3. `setAiUndoKeys(prev => new Set(prev).add(key))` — show inline link
4. `setAiUndoToast({ key, label: '<Field> changed by AI' })` — show toast
5. `useEffect` on `aiUndoToast` auto-dismisses after 8 000 ms

When undo is triggered (toast or inline link):
1. `prevAiValues.current.get(key)` → restore to state
2. `prevAiValues.current.delete(key)`
3. `setAiUndoKeys(prev => { const s = new Set(prev); s.delete(key); return s; })`
4. `setAiUndoToast(null)`
5. `setTimeout(save, 0)` — persist the restored value

When user manually edits a field with a pending undo:
- `onChange` calls `setAiUndoKeys(prev => { const s = new Set(prev); s.delete(key); return s; })` — hides inline link
- Ref entry stays in memory but becomes unreachable; cleared on next AI run for that field

## Affected AI Handlers

| Handler | Key | Field |
|---------|-----|-------|
| `handleGenerateSummary` | `'summary'` | `summary` state |
| `handleImproveExperience(expId, ...)` | `'exp:{expId}'` | `experience[i].bullets` |
| `handleImproveProject(projId, ...)` | `'proj:{projId}'` | `projects[i].bullets` |

Note: `handleImproveProject` mirrors `handleImproveExperience` — same pattern, same undo wiring.

## UI

### Inline undo link

Rendered immediately below the affected textarea, conditional on `aiUndoKeys.has(key)`:

```tsx
{aiUndoKeys.has(key) && (
  <button
    type="button"
    onClick={() => handleUndo(key)}
    className="mt-0.5 text-xs text-[#a0a0b0] hover:text-[#6c6cff] transition-colors"
  >
    ↩ Undo AI change
  </button>
)}
```

### Toast

Fixed bottom-right, rendered once at the Edit component root level, conditional on `aiUndoToast !== null`:

```tsx
{aiUndoToast && (
  <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-lg bg-[#1a1a2e] px-4 py-2.5 text-sm text-white shadow-lg">
    <span>✨ {aiUndoToast.label}</span>
    <button type="button" onClick={() => handleUndo(aiUndoToast.key)} className="font-medium text-[#a0a0ff] hover:text-white">
      ↩ Undo
    </button>
    <button type="button" onClick={() => setAiUndoToast(null)} className="text-[#a0a0b0] hover:text-white">×</button>
  </div>
)}
```

Auto-dismiss via:
```ts
useEffect(() => {
  if (!aiUndoToast) return;
  const t = setTimeout(() => setAiUndoToast(null), 8000);
  return () => clearTimeout(t);
}, [aiUndoToast]);
```

## Out of Scope

- Multi-level undo (undo manual edits) — not requested
- Persistence across page refresh — existing snapshot feature covers this
- Undo for ATS keywords / ATS score — those don't overwrite user text
- Any backend changes — purely frontend state

## Testing

One feature test (`tests/Feature/AiSuggestionTest.php`) already covers the AI endpoint. No new backend test needed.

Frontend: manually verify:
1. AI runs → toast appears + inline link appears
2. Click toast undo → original text restored, toast dismisses, inline link gone
3. Click inline undo → same result
4. Edit field manually after AI → inline link disappears
5. Toast auto-dismisses after 8s without clicking
