# Resumegen Apply (Chrome / Edge)

Browser extension that fills job application forms from your Resumegen resumes.

- **Never auto-submits**
- Empty fields only for bulk fill
- Insert chips for the focused field
- Types into ARIA combobox widgets (Workday-style school/country typeaheads) and clicks the best-matching rendered option, not just native `<select>`
- Tells you (instead of going silent) when the actual form is inside a cross-origin embedded frame we can't reach
- Says "reconnect, your token may have been revoked" instead of a generic "connect" screen when a previously-working token stops authenticating

After pulling heuristic updates, open `chrome://extensions` and hit **Reload** on Resumegen Apply so the new content scripts load.

## Load unpacked (local)

1. Open Chrome or Edge → Extensions → Developer mode
2. **Load unpacked** → select this `extension/` folder
3. In Resumegen: **Profile → Resumegen Apply → Generate connection token**
4. Extension **Settings** (⋯ → Settings): paste token; set URL to `https://resumegen.test` for Herd
5. **Test connection**, then open any application form and click the extension icon (side panel)

## Manual QA against fake application pages

Five fake application pages mimicking common ATS field-naming conventions
(Workday, Greenhouse, Lever, iCIMS, and a hand-built company site) are
served — local environment only — at `https://resumegen.test/dev/job-fixtures`.
Views live in `resources/views/dev/job-fixtures/`; each starts with an HTML
comment listing the specific challenges it's built to exercise.

## Files

| Path | Role |
|------|------|
| `manifest.json` | MV3 + side panel |
| `background/service-worker.js` | API + inject fill script |
| `sidepanel/` | Main UI (wireframe states) |
| `content/fill-heuristics.js` | ATS field scoring (Greenhouse, Workday, Ashby, …) |
| `content/fill.js` | DOM walk + empty-only fill / insert |
| `options/` | Token + app URL |
| `shared/app-base.js` | Shared `DEFAULT_APP_BASE` / `normalizeAppBase` (background + options) |
| `test/heuristics.test.cjs` | Node unit tests for scoring |

```bash
node --test extension/test/heuristics.test.cjs
```

## API

Uses Sanctum token against:

- `GET /api/extension/me`
- `GET /api/extension/resumes`
- `GET /api/extension/resumes/{id}/fill-profile`
