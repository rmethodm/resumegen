---
name: reverting-rejected-changes
description: Reverts a rejected change fully to its pre-change state instead of layering a new variation on top. Use when the user says "undo the changes to X", "undo all changes to X", "revert that", "put it back the way it was", "never mind, take it out", or rejects a styling/layout attempt after one or several iterations.
---

# Reverting Rejected Changes

Rejection means restore the baseline, not try again differently. A new variation on top of rejected code is another change to reject.

## Steps

1. Identify the pre-change baseline for the named target: the state before the first edit in that line of work, not the state before the most recent iteration. If several iterations were made (for example three regrouping attempts on one form), all of them are undone.
2. Restore that baseline exactly. Prefer `git diff` / `git checkout -- <file>` against the pre-change commit over hand-editing back toward what it used to look like — hand-reverting leaves residue.
3. Scope the revert to what the user named. Changes made in the same session for a different, still-approved request stay in place.
4. Keep an edit that was a separately approved general fix even if it touched the same file, and say so explicitly in the report.
5. Do not offer or apply an alternative styling in the same turn. Stop at the baseline and wait.
6. Report three things: the restored state in concrete terms, which specific attempts were undone (count them), and anything you kept plus why.

## Verify

- Diff the target against the pre-change baseline: it should be empty except for edits deliberately kept under step 4.
- Confirm the build/formatter still passes after the revert.
- Confirm no new styling or layout variant was introduced as part of the revert.