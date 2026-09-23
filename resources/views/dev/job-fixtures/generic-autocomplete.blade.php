<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Pinegate Logistics — Apply (test fixture)</title>
<style>
  body { font-family: Arial, sans-serif; background: #f7f7f9; margin: 0; color: #1d1d22; }
  .shell { max-width: 600px; margin: 0 auto; padding: 40px 24px 80px; }
  h1 { font-size: 20px; margin-bottom: 24px; }
  .field { margin-bottom: 16px; }
  input { width: 100%; box-sizing: border-box; padding: 9px; font-size: 14px; border: 1px solid #c3c3cc; border-radius: 4px; }
  .note { font-size: 12px; color: #777; margin-top: 24px; }
</style>
</head>
<body>
<!--
  QA fixture: fields carry NO name/id/label text at all worth matching on
  — every field is `name="f1"`, `f2`, … with no <label>. The only signal
  is the `autocomplete` attribute (per the HTML autofill spec), exercising
  RULES' `autocomplete` array in isolation rather than name/label regexes.
-->
<div class="shell">
  <h1>Pinegate Logistics — Warehouse Coordinator</h1>
  <form>
    <div class="field"><input name="f1" autocomplete="given-name" placeholder=" "></div>
    <div class="field"><input name="f2" autocomplete="family-name" placeholder=" "></div>
    <div class="field"><input name="f3" type="email" autocomplete="email" placeholder=" "></div>
    <div class="field"><input name="f4" type="tel" autocomplete="tel" placeholder=" "></div>
    <div class="field"><input name="f5" autocomplete="url" placeholder=" "></div>
    <div class="field"><input name="f6" autocomplete="address-level2" placeholder=" "></div>
    <div class="field"><input name="f7" autocomplete="organization" placeholder=" "></div>
  </form>
  <p class="note">Static test fixture — nothing here submits anywhere. No labels or revealing names on purpose; autocomplete attributes only.</p>
</div>
</body>
</html>
