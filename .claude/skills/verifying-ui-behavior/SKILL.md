---
name: verifying-ui-behavior
description: Verifies a UI or extension feature by actually exercising it in the running app before reporting it as done. Use when finishing any user-facing interaction — clicking a kanban item, dragging a task onto a pane, loading a generated fixture page in the extension, or any change to click, drag-and-drop, or page-scan behavior — and before saying a feature is "built and verified", "working", or "renders cleanly".
---

# Verifying UI Behavior

A clean build is not evidence the interaction works. Exercise the real thing before reporting it.

## Steps

1. Treat compiling, type-checking, and your own static reading of the code as preconditions only. They never count as verification of a click, drag, or page-scan behavior.
2. Launch or relaunch the app so the running process contains your change. Config changes (for example `dragDropEnabled` in `tauri.conf.json`) are not hot-reloadable — kill the dev process and start it again, then wait for the window before testing.
3. Drive the actual interaction the user will perform in the running UI: click the item, drag the task onto the pane, open each generated fixture page in the extension. Use the available UI-driving tooling (for example `orca computer get-app-state --app pid:<pid>` to read the window, then click/drag) rather than reasoning about what should happen.
4. Observe the result, not the absence of an error. "No exception thrown" and "the log looks fine" are not the same as "the item responded".
5. Test every instance the change claims to cover — all generated fixture pages, not one; every column of the board, not the first.
6. If nothing happens, treat it as a real bug in your change and root-cause it before reporting anything. Do not report a feature as working with a caveat that the automation tooling might be at fault.
7. In the report, state exactly what you exercised and what you saw. If you could not exercise it, say so plainly and say it is unverified — never call it verified.

## Verify

- You can name the interaction you performed and the observed result for each affected surface.
- Every page/item/column the change claims to cover was exercised, not sampled.
- Nothing is described as "built and verified" on the strength of a build alone.