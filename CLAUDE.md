<!-- dgc-policy-v1 -->
# Dual-Graph Context Policy

This project uses a local dual-graph MCP server (graperoot-pro) for efficient,
budget-aware context retrieval. Always prefer it over native file exploration.

## MANDATORY: Always follow this order

1. **Call `graph_continue` first** -- before any file exploration, grep, or code reading.

2. **If `graph_continue` returns `needs_project=true`**: call `graph_scan` with the
   current project directory (`pwd`). Do NOT ask the user.

3. **If `graph_continue` returns `skip=true`**: project is too small for the graph to
   help. Skip all graph tools and explore normally.

4. **Read `recommended_files`** using `graph_read` -- one call per file.
   - `recommended_files` may contain `file::symbol` entries (e.g. `src/auth.ts::handleLogin`).
     Pass them verbatim to `graph_read(file: "src/auth.ts::handleLogin")` -- it reads only
     that symbol's lines, not the full file.

5. **Check `confidence` and obey the caps strictly:**
   - `confidence=high` -> Stop. Do NOT grep or explore further.
   - `confidence=medium` -> If recommended files are insufficient, call `fallback_rg`
     at most `max_supplementary_greps` time(s) with specific terms, then `graph_read`
     at most `max_supplementary_files` additional file(s). Then stop.
   - `confidence=low` -> Call `fallback_rg` at most `max_supplementary_greps` time(s),
     then `graph_read` at most `max_supplementary_files` file(s). Then stop.

## Exhaustive enumeration tasks

Some tasks require scanning **every file** -- e.g. "find all dead exports", "list every
.find() without a limit", "audit all test files". Use these tools first:

- **`graph_dead_exports()`** -- pre-computed at scan time. Use for any dead-export task.
- **`graph_grep_all(pattern, file_glob?, max_hits?)`** -- exhaustive grep, no call cap.

## Rules

- Do NOT use `rg`, `grep`, or bash file exploration before calling `graph_continue`.
- Do NOT do broad/recursive exploration at any confidence level.
- After edits, call `graph_register_edit(files: ["path/to/file"])`. The parameter is
  `files` (plural, always an array). Use `file::symbol` notation when the edit targets
  a specific function, class, or hook.
<!-- /dgc-policy-v1 -->

## Verification Policy

Do not report a feature, fix, integration, or deploy as done based on configuration being in place, a clean build, passing tests, or an internal function call. Prove it with a real run:

- **UI features**: launch the actual app (e.g. `npm run tauri dev`) and drive the real UI yourself — click, drag, dispatch. Not the test suite, not an `import` of an internal function with a `console.log`.
- **UI/layout changes**: open the affected page live in the browser (use the connected Chrome session when the user offers one) and look at the rendered result — never sign off a visual change from code alone. If the user attached a screenshot or reference image, compare the rendered page against it region by region until it matches, and explicitly check desktop widths for alignment drift (desktop top-right misalignment has slipped through before). After styling changes, run Pint on the touched files before the browser check.
- **Fixes**: after a full kill-and-restart of the app/dev server, re-confirm the fix still holds — not just in the session where it was applied.
- **Integrations and deploys**: perform the real action (send an actual test email, run an actual deploy) rather than reporting that configuration is correct.

If the live run does nothing where you expected it to work, that is the real bug report — find the actual root cause instead of defending the earlier "done" claim.
