#!/bin/bash
# Reminds Claude to activate the matching project skill when it edits a file the
# skill covers. Prose in CLAUDE.md ("IMPORTANT: Activate inertia-react-development")
# fired zero times across 122 transcripts — same lesson as block-migrate-rollback.sh,
# so this rule gets teeth too.
#
# Nudges only: emits additionalContext with permissionDecision "defer", so the edit
# is neither blocked nor auto-approved and the normal permission flow still applies.
#
# ponytail: fires once per skill per session via a /tmp marker, not on every edit —
# re-injecting the same sentence on all 40 edits of a page is how context gets
# ignored. Markers are session-scoped and left for /tmp cleanup to reap.

input=$(cat)
file_path=$(jq -r '.tool_input.file_path // ""' <<<"$input" 2>/dev/null)
session_id=$(jq -r '.session_id // "nosession"' <<<"$input" 2>/dev/null)

skill=""
case "$file_path" in
  */resources/js/*.tsx|*/resources/js/*.jsx) skill="inertia-react-development" ;;
  */app/*.php)                               skill="laravel-best-practices" ;;
esac

[[ -z "$skill" ]] && exit 0

marker="/tmp/claude-skill-nudge-${session_id}-${skill}"
[[ -f "$marker" ]] && exit 0
touch "$marker"

jq -n --arg s "$skill" '{
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "defer",
    additionalContext: "This project ships a `\($s)` skill covering the file being edited, and it has not been activated this session. Invoke it with the Skill tool before continuing, unless it is plainly irrelevant to this particular edit."
  }
}'

exit 0
