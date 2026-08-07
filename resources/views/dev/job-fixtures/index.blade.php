<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Job application test fixtures</title>
<style>
  body { font-family: -apple-system, Arial, sans-serif; max-width: 640px; margin: 48px auto; color: #1a1a2e; }
  h1 { font-size: 18px; }
  ul { padding-left: 20px; }
  li { margin-bottom: 10px; }
  a { color: #002e5d; }
  p { color: #6b6b76; font-size: 13px; }
</style>
</head>
<body>
<h1>Job application test fixtures</h1>
<p>Local-only fake application pages for testing Resumegen Apply. Not registered outside the <code>local</code> environment.</p>
<ul>
  <li><a href="{{ route('dev.job-fixtures.show', 'workday') }}">Workday-style</a> — data-automation-id, shadow-DOM phone field, ARIA combobox, hidden wizard steps</li>
  <li><a href="{{ route('dev.job-fixtures.show', 'greenhouse') }}">Greenhouse-style</a> — bracketed field names, native select, EEO block trap</li>
  <li><a href="{{ route('dev.job-fixtures.show', 'lever') }}">Lever-style</a> — single full-name field, contenteditable box, duplicate website fields</li>
  <li><a href="{{ route('dev.job-fixtures.show', 'icims') }}">iCIMS-style</a> — same-origin iframe form, systemfield naming, cross-origin EEO frame</li>
  <li><a href="{{ route('dev.job-fixtures.show', 'custom') }}">Custom career page</a> — label-only matching, confirm-email trap, known heuristic gaps</li>
</ul>
</body>
</html>
