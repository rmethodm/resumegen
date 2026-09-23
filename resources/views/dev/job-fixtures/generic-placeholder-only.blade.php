<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Coral Bay Hospitality — Apply (test fixture)</title>
<style>
  body { font-family: Arial, sans-serif; background: #fff; margin: 0; color: #222; }
  .shell { max-width: 600px; margin: 0 auto; padding: 40px 24px 80px; }
  h1 { font-size: 20px; margin-bottom: 24px; }
  .field { margin-bottom: 16px; }
  input, textarea { width: 100%; box-sizing: border-box; padding: 9px; font-size: 14px; border: 1px solid #c3c3cc; border-radius: 4px; }
  .note { font-size: 12px; color: #777; margin-top: 24px; }
</style>
</head>
<body>
<!--
  QA fixture: no <label> elements and no autocomplete/name hints at all —
  every field's only signal is its placeholder text. buildSignals() folds
  placeholder into labelNorm, so RULES' label regexes should still match
  here; this fixture isolates that specific fallback path.
-->
<div class="shell">
  <h1>Coral Bay Hospitality — Front Desk Associate</h1>
  <form>
    <div class="field"><input id="i1" placeholder="First name"></div>
    <div class="field"><input id="i2" placeholder="Last name"></div>
    <div class="field"><input id="i3" type="email" placeholder="you@example.com"></div>
    <div class="field"><input id="i4" type="tel" placeholder="(555) 555-5555"></div>
    <div class="field"><input id="i5" placeholder="City, State"></div>
    <div class="field"><input id="i6" placeholder="linkedin.com/in/…"></div>
    <div class="field"><textarea id="i7" rows="4" placeholder="Tell us about your current role"></textarea></div>
  </form>
  <p class="note">Static test fixture — nothing here submits anywhere. No labels, no name/id hints — placeholder text is the only signal.</p>
</div>
</body>
</html>
