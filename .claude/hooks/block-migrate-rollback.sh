#!/bin/bash
# Blocks migrate:rollback / :reset / :refresh — migrations here are forward-only.
# Rolling back cascades ~7 migrations deep and leaves the schema in a half-torn
# state that looks exactly like a corrupted dump. See CLAUDE.md.
# ponytail: regex on the command string, not a real shell parser. Requires an
# "artisan" prefix so grepping for or documenting the term isn't blocked too.
# Catches the honest typo, which is the actual failure mode; someone determined
# to route around it via a shell variable can, and that's fine.

command=$(jq -r '.tool_input.command // ""')

if [[ "$command" =~ artisan[[:space:]]+migrate:(rollback|reset|refresh) ]]; then
  echo "BLOCKED: migrations in this project are forward-only." >&2
  echo "migrate:rollback/reset/refresh cascade ~7 migrations deep and leave the" >&2
  echo "database in a wrecked half-state (this has been misdiagnosed as a bad" >&2
  echo "dump twice). Use 'php artisan migrate:fresh --seed' to rebuild." >&2
  exit 2
fi

exit 0
