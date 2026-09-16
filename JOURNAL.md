# <Project> — Journal

Append-only. Newest entry on top. Never edit past entries — this is history,
not current state. One entry per session: the shutdown debrief.

---

## 2026-09-15 — Wizard runtime verification

**Did:** Tested actual Vite development assets, reproduced and fixed Vitest deleting public/hot, made the HTML use a single app entry with a development-only eager resolver, and fixed failed Skip navigation. Full suite: 471 Laravel (2,112 assertions), 51 JS; build/Pint passed. Cold development startup, hot reload and test execution preserved wizard state. Restored built-assets mode and stopped the temporary server.

**Least confident about (Q1):** The old invalid-hook crash’s exact triggering sequence cannot be reconstructed from its log; current dev/production runtime and identified asset-lifecycle bugs are verified. New timestamped errors would distinguish any remaining cause.

**Improve (Q5):** Test both built and dev asset modes and preserve active dev-server state during test runs. No new job submitted. Changes remain uncommitted/unpushed per PLAN.

## 2026-09-15 — Naming and final flow fixes

**Did:** Separated dashboard version/group labels, clarified account versus starter profile, restored target-role/company controls, and mitigated the logged wizard React dispatcher error through Vite runtime deduplication/pre-bundling. Full Laravel: 470 passed (2,110 assertions); JS: 48 passed; build/Pint passed. Browser verified autosave, names, account labels, and four wizard steps without submitting a job.

**Least confident about (Q1):** The intermittent wizard fault cannot be claimed definitively resolved from one successful flow. Historic logs support a dev-module mismatch; a recurrence with fresh network/module evidence would prove whether further fixes are needed.

**Improve (Q5):** Keep version identity distinct from group identity everywhere; use explicit descriptions for the two sources of reusable profile defaults. No unrelated changes staged; no commit/push per PLAN.

## 2026-09-15 — Next up across the application process

**Did:** Added saved-job preparation with direct resume links, extended due follow-ups to Interviewing/Offer, suppressed duplicate lower-priority prompts, respected future preparation dates, and excluded rejected interviews. Full Laravel suite: 469 passed (2,086 assertions). Build and Pint passed; browser showed the saved demo prompt.

**Least confident about (Q1):** Saved status signals pending preparation, not whether tailoring is complete. User workflow feedback would validate whether a separate ready-to-apply state is needed; no new status introduced.

**Improve (Q5):** Keep explicit due events ahead of general preparation. Next review item is naming/version clarity. Existing branch and unrelated changes preserved; no commit or push per PLAN.

## 2026-09-15 — Correct job wording guidance

**Did:** Excluded internal metadata and omitted sections from JD overlap, matched whole normalized terms, fixed punctuation and truncated counts, filtered posting filler, and replaced JD add-skill buttons with contextual review prompts. 48 JavaScript tests and build passed; signed-in browser confirmed the demo’s 0/7 overlap and updated guidance.

**Least confident about (Q1):** Lexical comparison cannot assess synonyms, relevance, or qualifications. UI states this explicitly; a separately scoped semantic evaluation would be needed to claim more.

**Improve (Q5):** Keep job wording overlap visibly separate from the resume-strength score and require meaningful resume evidence instead of encouraging keyword insertion. Next is review item 3 if requested.

**Repository:** Item 1 and unrelated changes preserved. No commit or push under PLAN’s existing instruction to keep ShadEditor as-is unless requested.

## 2026-09-15 — Preserve track-only descriptions

**Did:** Stored job descriptions independently of resumes; exposed view/edit in the application modal; retained tailored-version behavior. Applied the local migration. 39 focused tests (146 assertions), build, and Pint passed; browser creation and edit both survived reload. Build emitted CSS-token and chunk-size warnings.

**Least confident about (Q1):** Historic track-only text was discarded before this fix and cannot be recovered from the application record. No recovery/backfill is claimed. Existing resume descriptions remain separate snapshots.

**Full-suite follow-up:** User requested the full suite. Laravel: 465 passed (2,012 assertions); JavaScript: 41 passed across 11 files. No failures.

**Improve (Q5):** Keep opportunity details on the job record and expose them before resume selection. Next review priority is score/keyword guidance, pending user direction. Optional user debrief and full-suite preference requested.

**Repository:** Existing ShadEditor checkout and unrelated dirty work preserved; PLAN instructs keeping the branch as-is unless asked to PR/merge/commit.

## 2026-08-11 — Application desk, editor frame, and landing pass

**Did:** Added an operator summary to the existing job-application Kanban, widened and softened the workstation frame, and simplified the landing hero around the real resume preview. Build passed; 14 focused Laravel feature tests passed; public responsive Playwright checks passed at mobile, tablet, and desktop sizes.

**Least confident about (Q1):** Authenticated visual QA remains unverified because the project Dusk server expected at `127.0.0.1:8001` was not running. A signed-in browser pass would prove the application desk and workstation render correctly with real data.

**Suggested improvement (Q5):** Run the Dusk server-backed workstation test before the next UI pass, then add one authenticated screenshot check for the application desk.

## 2026-08-05 — Resumegen Apply extension MVP

**Did:** Product wireframes → Sanctum fill-profile API + Profile tokens → MV3 side panel rewrite → scored ATS heuristics (21 node tests). User confirmed fill works. Discussed job-radar (feasible; not built). Docs/CONTEXT updated.

**Least confident about (Q1):**
- Multi-step Workday / custom comboboxes — proven only by real-form QA.
- Long-term store review if host_permissions stay `http(s)://*/*`.

**Suggested improvement (Q5):** One-click connect (no paste token) before job-radar.

**Unstated assumptions (Q2):** User remains on Chrome/Edge + Herd local token flow.
**Biggest thing being missed (Q3):** Local commits not pushed (5+ on main).
**Could've gone better (Q4):** Earlier discovery that `extension/` was dead activity code.

---

## Template — prior sessions
...
