<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Vantage Point Media — Apply (test fixture)</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #fafbfc; margin: 0; color: #24262b; }
  .shell { max-width: 620px; margin: 0 auto; padding: 44px 24px 88px; }
  h1 { font-size: 21px; margin: 0 0 28px; }
  .field { margin-bottom: 16px; }
  label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 5px; }
  input { width: 100%; box-sizing: border-box; padding: 9px 10px; font-size: 14px; border: 1px solid #d6d6dc; border-radius: 6px; }
  .note { font-size: 12px; color: #7a7a85; margin-top: 24px; }
</style>
</head>
<body>
<!--
  QA fixture: SmartRecruiters is explicitly deferred per the 2026-09-14
  extension-upgrade spec — RULES has no ATS-specific regex tuned for its
  field-naming convention (React-generated ids like "react-select-3-input"
  alongside plain camelCase names). This fixture is a NEGATIVE/fallback
  test: it confirms the extension still fills these fields correctly via
  the generic name + label heuristics, without any dedicated pattern.
-->
<div class="shell">
  <h1>Vantage Point Media — Growth Marketer</h1>
  <form>
    <div class="field">
      <label for="firstName">First Name</label>
      <input id="firstName" name="firstName" type="text">
    </div>
    <div class="field">
      <label for="lastName">Last Name</label>
      <input id="lastName" name="lastName" type="text">
    </div>
    <div class="field">
      <label for="react-select-2-input">Email</label>
      <input id="react-select-2-input" name="email" type="email">
    </div>
    <div class="field">
      <label for="react-select-3-input">Phone Number</label>
      <input id="react-select-3-input" name="mobileNumber" type="tel">
    </div>
    <div class="field">
      <label for="currentLocation">Current Location</label>
      <input id="currentLocation" name="currentLocation" type="text">
    </div>
  </form>
  <p class="note">Static test fixture — nothing here submits anywhere. No SmartRecruiters-specific pattern exists in RULES on purpose; this exercises the generic fallback.</p>
</div>
</body>
</html>
