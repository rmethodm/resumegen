# Resumegen Apply (Chrome / Edge)

Browser extension that fills job application forms from your Resumegen resumes.

- **Never auto-submits**
- Empty fields only for bulk fill
- Insert chips for the focused field

## Load unpacked (local)

1. Open Chrome or Edge → Extensions → Developer mode
2. **Load unpacked** → select this `extension/` folder
3. In Resumegen: **Profile → Resumegen Apply → Generate connection token**
4. Extension **Settings** (⋯ → Settings): paste token; set URL to `https://resumegen.test` for Herd
5. **Test connection**, then open any application form and click the extension icon (side panel)

## Files

| Path | Role |
|------|------|
| `manifest.json` | MV3 + side panel |
| `background/service-worker.js` | API + inject fill script |
| `sidepanel/` | Main UI (wireframe states) |
| `content/fill.js` | Field heuristics (on-demand inject) |
| `options/` | Token + app URL |

## API

Uses Sanctum token against:

- `GET /api/extension/me`
- `GET /api/extension/resumes`
- `GET /api/extension/resumes/{id}/fill-profile`
