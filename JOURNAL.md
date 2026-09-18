# <Project> — Journal

Append-only. Newest entry on top. Never edit past entries — this is history,
not current state. One entry per session: the shutdown debrief.

---

## 2026-09-18 — Six more workstation concepts

Added a second linked preview round with six distinct job-matching and potential premium workflows, preserving the original five. Verified the source-based matching logic with five focused tests; TypeScript and the two-entry Vite build pass. Browser checks cover each layout, version isolation, add-job flow, evidence matrix/filtering, edit acceptance and rollback, stage changes, preparation, checklist invalidation, text review, export, and mobile overflow. PLAN/NOTES/README updated; no checkboxes changed.

**Q1 — Least confident:** Which added capabilities users would pay for. The concepts demonstrate value hypotheses, not validated conversion improvements; interviews and a small pricing/feature-choice study would resolve that. Exact-phrase matching also intentionally misses synonyms.

**Q2 — Assumptions:** Used fictional jobs and resume fixtures, a text brief export, and session-local behavior; no integration or purchase flow was requested.

**Q3 — Biggest missing piece:** Real job-feed quality, eligibility/location constraints, data freshness, and the operational cost of any future assisted tailoring service.

**Q4 — What could improve the session:** Evaluate the six directions with the same applicant task and measure clarity/time, rather than selecting on appearance alone.

**Q5 — Suggested improvement:** Pick one navigation model and one recurring paid benefit before production integration. Preserve evidence transparency and independent versions. Remote push remains blocked by the earlier review of unrelated queued commits.

## 2026-09-18 — Five workstation concepts

Inspected current workstation, header, resume model/controller/types, and live UI. Built five isolated shadcn layouts with an interactive selector and independent version fixtures. TypeScript and isolated build pass; browser checks covered all directions, version copy/edit isolation, checkpoint restore, guided navigation, filtering, review/keyword modes and mobile behavior. No PLAN checkboxes changed. README and NOTES updated.

**Q1 — Least confident:** Which navigation model feels easiest in daily use. User selection and testing with a larger version group would resolve this. These are mockups, not backend-integrated replacements.

**Q5 — Suggested improvement:** Choose the navigation model first, then integrate the existing autosave, real versions and PDF/DOCX export into that one direction. Earlier automatic approval review still blocks pushing unrelated local commits without user approval.

## 2026-09-18 — Remove demo navbar

Removed the top navbar and retained a mobile sidebar trigger in the content area. PLAN and NOTES updated; no checkbox or README changes.

**Q1 — Least confident:** None beyond user visual preference for the remaining breadcrumb.

**Q5 — Suggested improvement:** Keep primary navigation in the sidebar. Remote push remains blocked pending earlier approval.

## 2026-09-18 — Flush workspace frame

Removed the desktop-only cream frame rule that inset and rounded the main content beside the sidebar. PLAN and NOTES updated; no checkbox changes and no README change required.

**Q1 — Least confident:** Remaining visual preferences require user review; this change targets only the reported outer curve.

**Q5 — Suggested improvement:** Keep the app shell flush and reserve rounded surfaces for internal cards. Push remains pending prior approval.

## 2026-09-18 — Standard shadcn sidebar

Removed custom reference sidebar styling and composed standard shadcn groups, submenu, separators, rail and account footer. Checked settings, navigation dialog, desktop collapse and mobile menu. Build passed. Updated PLAN, NOTES and README; no checkboxes changed. Push remains pending approval for unrelated main commits.

**Q1 — Least confident:** Visual preference for the retained warm palette; user review can resolve this.

**Q5 — Suggested improvement:** Keep sidebar styling in the standard component system to avoid custom CSS drift.

## 2026-09-18 — Reference sidebar

Replaced standalone demo navigation with profile, primary links, expanded Settings timeline, Payments highlight, Help Center and collapse control. Build passed; browser checks covered settings toggle, Payments dialog, collapse/expand and mobile menu without page errors. Documentation updated; no PLAN checkbox changes. Push remains blocked by the earlier automatic review because main contains unrelated commits.

**Q1 — Least confident:** The source portrait is represented by initials; visual review can determine whether a separately supplied portrait is needed.

**Q5 — Suggested improvement:** Connect navigation to real destinations only when those features are defined; current dialogs clearly identify demo scope.


## 2026-09-18 — Warm Cream shadcn demo

Applied the light screenshot reference to the standalone demo using semantic tokens and scoped component styling. Preserved existing unrelated working changes. Build passed; browser checks verified cream/midnight switching, white dialog surface, no page errors, and no document overflow at mobile width. PLAN status, NOTES, and README updated; no checkboxes changed.

**Q1 — Least confident:** Exact source colors and typeface are approximate; side-by-side user review would resolve those visual preferences.

**Q5 — Suggested improvement:** Keep Warm Cream as a reusable theme preset so future demo components inherit consistent surfaces.

Commit and push: to be attempted as the final shutdown step, staging only this task’s changes.

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
