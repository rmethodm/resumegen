<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Summit Ridge Clinic — Apply (test fixture)</title>
<style>
  body { font-family: Arial, sans-serif; background: #fff; margin: 0; color: #222; }
  .shell { max-width: 600px; margin: 0 auto; padding: 40px 24px 80px; }
  h1 { font-size: 20px; margin-bottom: 24px; }
  .field { margin-bottom: 16px; }
  label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 4px; }
  input { width: 100%; box-sizing: border-box; padding: 9px; font-size: 14px; border: 1px solid #c3c3cc; border-radius: 4px; }
  .hint { font-size: 11px; color: #a3541f; font-weight: bold; margin-top: 3px; }
  .note { font-size: 12px; color: #777; margin-top: 24px; }
</style>
</head>
<body>
<!--
  QA fixture: every fillable field is immediately followed by a "confirm /
  verify / re-enter" trap for the same value. RULES' exclude regexes for
  email (\bconfirm\b, \bverify\b, \bre-?enter\b, \bsecondary\b) and phone
  (\bconfirm\b) must keep every trap field empty while still filling the
  real one directly above it.
-->
<div class="shell">
  <h1>Summit Ridge Clinic — Medical Receptionist</h1>
  <form>
    <div class="field">
      <label for="c1">Email Address</label>
      <input id="c1" name="email" type="email">
    </div>
    <div class="field">
      <label for="c2">Confirm Email Address</label>
      <input id="c2" name="email_confirmation" type="email">
      <div class="hint">Trap: must stay empty.</div>
    </div>
    <div class="field">
      <label for="c3">Phone Number</label>
      <input id="c3" name="phone" type="tel">
    </div>
    <div class="field">
      <label for="c4">Verify Phone Number</label>
      <input id="c4" name="phone_verify" type="tel">
      <div class="hint">Trap: must stay empty.</div>
    </div>
    <div class="field">
      <label for="c5">Email Address (secondary)</label>
      <input id="c5" name="email_secondary" type="email">
      <div class="hint">Trap: must stay empty — a genuine second inbox, not the applicant's primary.</div>
    </div>
  </form>
  <p class="note">Static test fixture — nothing here submits anywhere.</p>
</div>
</body>
</html>
