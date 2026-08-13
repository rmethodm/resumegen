# <Project> — Journal

Append-only. Newest entry on top. Never edit past entries — this is history,
not current state. One entry per session: the shutdown debrief.

---

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
