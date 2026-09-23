<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Halberd Systems — Application, Page 1 of 3 (test fixture)</title>
<style>
  body { font-family: Arial, sans-serif; background: #f7f7f9; margin: 0; color: #1d1d22; }
  .shell { max-width: 600px; margin: 0 auto; padding: 40px 24px 80px; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  .step { color: #666; margin-bottom: 24px; font-size: 13px; }
  .field { margin-bottom: 16px; }
  label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 4px; }
  input { width: 100%; box-sizing: border-box; padding: 9px; font-size: 14px; border: 1px solid #c3c3cc; border-radius: 4px; }
  .btn { display: inline-block; background: #002e5d; color: #fff; text-decoration: none; padding: 10px 22px; border-radius: 6px; font-size: 14px; margin-top: 8px; }
  .note { font-size: 12px; color: #777; margin-top: 32px; }
</style>
</head>
<body>
<!--
  QA fixture: a 3-step application wizard where each step is revealed by
  a client-side "Continue" click (display toggle), not a full page
  navigation. This is intentionally similar in shape to Workday's hidden-
  step case, but the trigger is a user click rather than the step being
  hidden from load — it exercises re-scanning after DOM mutation (a step
  becoming visible later) rather than the initial-load-only case the
  other fixtures cover.
-->
<div class="shell">
  <h1>Halberd Systems — Field Engineer</h1>
  <div class="step">Step 1 of 3 — Contact Information</div>
  <form>
    <div class="field">
      <label for="m1">First Name</label>
      <input id="m1" name="first_name" type="text">
    </div>
    <div class="field">
      <label for="m2">Last Name</label>
      <input id="m2" name="last_name" type="text">
    </div>
    <div class="field">
      <label for="m3">Email</label>
      <input id="m3" name="email" type="email">
    </div>
  </form>
  <a class="btn" href="#step-2" onclick="document.getElementById('step-1-wrap').style.display='none'; document.getElementById('step-2-wrap').style.display='block'; return false;">Continue</a>

  <div id="step-1-wrap"></div>

  <div id="step-2-wrap" style="display:none; margin-top: 32px;">
    <div class="step">Step 2 of 3 — Experience</div>
    <form>
      <div class="field">
        <label for="m4">Current Title</label>
        <input id="m4" name="current_title" type="text">
      </div>
      <div class="field">
        <label for="m5">Current Company</label>
        <input id="m5" name="current_company" type="text">
      </div>
    </form>
    <a class="btn" href="#step-3" onclick="document.getElementById('step-2-wrap').style.display='none'; document.getElementById('step-3-wrap').style.display='block'; return false;">Continue</a>
  </div>

  <div id="step-3-wrap" style="display:none; margin-top: 32px;">
    <div class="step">Step 3 of 3 — Links</div>
    <form>
      <div class="field">
        <label for="m6">LinkedIn</label>
        <input id="m6" name="linkedin" type="text">
      </div>
      <div class="field">
        <label for="m7">Website / Portfolio</label>
        <input id="m7" name="website" type="text">
      </div>
    </form>
  </div>

  <p class="note">Static test fixture — nothing here submits anywhere. Each "Continue" swaps visibility client-side; earlier steps' fields stay mounted but hidden, mirroring a real ATS wizard rather than separate page loads.</p>
</div>
</body>
</html>
