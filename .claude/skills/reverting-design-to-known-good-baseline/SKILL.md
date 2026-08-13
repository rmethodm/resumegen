---
name: reverting-design-to-known-good-baseline
description: Cleanly reverts design/theme files (app.css, DESIGN.md, other theme CSS) to a named known-good baseline. Use when the user says "revert X back to the <name> version", "reset the css to basic black and white", "reset to the color scheme when Laravel is first installed", "start completely over with the color scheme", or "restore app.css to a version from N days ago / commit <sha>".
---

# Reverting Design to a Known-Good Baseline

When the user asks to undo design work, do a clean restore of the named baseline. Never incrementally patch the current styles toward what the old version looked like.

## Procedure

1. **Identify the baseline.** One of:
   - A prior commit: find it with `git log --oneline -- resources/css/app.css DESIGN.md` (or the date the user gave, e.g. "2 days ago").
   - A named prior version (e.g. "the cream/orange version") — locate the commit where that palette last existed.
   - Stock framework defaults (e.g. "the color scheme when Laravel is first installed") — use the framework's fresh-install starter-kit CSS, not an approximation of it.
2. **Restore, don't patch.** `git checkout <commit> -- <files>` (or write the stock default file verbatim). Hand-editing toward the old look leaves residue and drift.
3. **Revert the whole kind, not just the named file.** If one CSS file is restored to a baseline, restore every theme file of the same kind (all theme CSS plus DESIGN.md) to that same baseline so they stay consistent. State which files you reverted.
4. **Rebuild and verify.** Run the asset build (`npm run build` / dev server) and confirm the UI actually shows the baseline palette.
5. **Keep DESIGN.md in sync** with the restored palette — if the baseline predates DESIGN.md content, update it to describe the restored scheme.
