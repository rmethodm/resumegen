- A) On demand only — only recalculate when the user explicitly clicks "Refresh Score" (cheapest, full
  user control)
  - B) Auto-invalidate on save — mark the cached score as stale whenever the resume content changes, and
  re-fetch automatically on next page load
  - C) Auto-invalidate + background refresh — same as B but silently re-fetch in the background so the
  user always sees a fresh score without waiting