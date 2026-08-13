# Chrome Web Store — Permission Justifications

Paste these into the Developer Dashboard's "Permission justification" fields
(Privacy practices tab) when submitting Resumegen Apply. One field per
permission listed in `manifest.json`.

## storage

Stores the user's connection token (a personal access token they generate in
their Resumegen account) and their configured Resumegen app URL, so the
extension stays signed in between browser sessions without asking the user
to re-paste the token on every page. No browsing data is stored.

## activeTab

Lets the user grant the extension access to the current tab only when they
click the extension icon or open the side panel, to read and fill the job
application form visible on that page. The extension does not run on tabs
the user has not explicitly activated it on.

## scripting

Injects the field-fill script into the active tab after the user initiates a
fill from the side panel. This is how form fields get populated with the
user's resume data (name, experience, education, etc.) and how ARIA
combobox/typeahead widgets (Workday-style school/country pickers) are
handled — a plain `<select>`-only approach cannot fill those. Injection only
happens on user action; the extension never auto-fills or auto-submits.

## sidePanel

Hosts the extension's main UI (resume picker, field-fill controls, fill
status) in Chrome's side panel instead of a popup, so the user can see the
panel and the job application page at the same time while filling a form.

## tabs

Used only to detect the current tab's URL so the side panel can show which
site the user is on and warn them if the actual form is inside a
cross-origin iframe the extension cannot reach. The extension does not
enumerate, track, or store the user's full tab/browsing history — only the
currently active tab's URL, read at the moment the side panel is open.

## host_permissions (http://*/*, https://*/*)

Job application forms exist on an unbounded, unpredictable set of employer
and ATS domains (Greenhouse, Workday, Lever, Ashby, iCIMS, and thousands of
individual company career sites) that cannot be enumerated in advance. Broad
host access lets the user fill a form on any site they land on, but access
is gated by `activeTab`/user action — the extension does not read or modify
pages the user has not opened the side panel on. See the Privacy Policy
section "Browser extension" at `<app-url>/legal/privacy` for the full data
handling description.

---

Single-purpose statement (paste into the "Single purpose" field):

> Resumegen Apply fills job application form fields from the user's own
> Resumegen resume data, so they can review and submit the form themselves.
> It does not perform any other function.

Data usage checklist (Privacy practices tab):

- Personally identifiable information: **collected** (resume content the
  user chooses to fill — sourced from their own Resumegen account, not
  harvested from the page)
- Authentication information: **collected** (the connection token, stored
  locally in `chrome.storage`)
- Website content: **not collected** — the extension reads form field
  structure locally to decide what to fill; it does not transmit page
  content to Resumegen or any third party
- Not sold to third parties; not used for purposes unrelated to the stated
  single purpose; not used to determine creditworthiness or for lending.
