<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Redwood Peak Outfitters — Apply (test fixture)</title>
<style>
  body { font-family: Arial, sans-serif; background: #f7f7f9; margin: 0; color: #1d1d22; }
  .shell { max-width: 600px; margin: 0 auto; padding: 40px 24px 80px; }
  h1 { font-size: 20px; margin-bottom: 24px; }
  .field { margin-bottom: 16px; }
  label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 4px; }
  input, textarea { width: 100%; box-sizing: border-box; padding: 9px; font-size: 14px; border: 1px solid #c3c3cc; border-radius: 4px; }
  .note { font-size: 12px; color: #777; margin-top: 24px; }
</style>
</head>
<body>
<!--
  QA fixture: a two-step wizard where the inactive step is hidden with
  `style="display:none"` rather than the [hidden] attribute Workday's
  fixture uses. Step 2's fields (currently invisible) must NOT be filled
  while step 1 is active — confirms visibility detection isn't tied to
  one specific hiding technique.
-->
<div class="shell">
  <h1>Redwood Peak Outfitters — Retail Associate</h1>
  <form>
    <section id="step-1">
      <div class="field">
        <label for="w1">First Name</label>
        <input id="w1" name="first_name" type="text">
      </div>
      <div class="field">
        <label for="w2">Last Name</label>
        <input id="w2" name="last_name" type="text">
      </div>
      <div class="field">
        <label for="w3">Email</label>
        <input id="w3" name="email" type="email">
      </div>
    </section>

    <section id="step-2" style="display:none;">
      <div class="field">
        <label for="w4">Current Title</label>
        <input id="w4" name="current_title" type="text">
      </div>
      <div class="field">
        <label for="w5">Current Company</label>
        <input id="w5" name="current_company" type="text">
      </div>
      <div class="field">
        <label for="w6">Summary</label>
        <textarea id="w6" name="summary" rows="4"></textarea>
      </div>
    </section>
  </form>
  <p class="note">Static test fixture — nothing here submits anywhere. Step 2 is mounted but hidden via CSS, not the [hidden] attribute.</p>
</div>
</body>
</html>
