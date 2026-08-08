---
name: porting-from-another-project
description: Ports or imports code, features, or UI from another local project into this one, one approved item at a time. Use when the user points at another project path (for example /Users/rmethod/Herd/Resumo) and asks to pull in, port, import, bring over, raid, or copy features, pages, models, or components from it — including when they say "pull in everything".
---

# Porting From Another Project

Import work from a sibling project in order, pausing for explicit approval on each item before building it.

## Steps

1. Do a read-only survey of the source path before proposing anything: list its pages, controllers, routes, and models, and compare them to this repo's equivalents. Do not edit any file yet.
2. Compare the survey against this repo's documented decisions (CLAUDE.md "Removed Features", "Key Design Decisions", data model, auth stack). Flag, before building a plan, any item that would reintroduce a deliberately removed feature or reverse a foundational decision (data model, auth), and ask how to handle it.
3. Produce a **numbered inventory** of candidate items, grouped by feature area, with an explicit list of what is excluded and why. "Pull in everything" is not approval to start — the inventory is what gets approved.
4. Confirm the working order and the foundation before item 1: which architecture wins where the two projects conflict, and whether items are re-implemented on this repo's stack rather than copy-pasted.
5. Work the list **strictly in order**. For each item, present what it is and how you intend to build it, then stop and wait for the user to approve it or ask for changes.
6. Implement only the approved item, report what changed, then move to the next item and repeat step 5. Do not batch two items into one pass, and do not start the next item because the previous one went smoothly.

## Verify

- Every implemented item has an explicit approval from the user in this session.
- Items were done in the agreed order, not by convenience.
- Anything excluded (removed features, foundation conflicts) was named to the user rather than silently skipped or silently included.
