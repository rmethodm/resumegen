<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Corvallis Materials — Careers (test fixture)</title>
<style>
  body { font-family: Tahoma, Arial, sans-serif; background: #eef1f4; margin: 0; color: #202225; }
  .shell { max-width: 700px; margin: 0 auto; padding: 32px 24px 80px; }
  header { background: #3b5170; color: #fff; padding: 16px 24px; }
  header h1 { margin: 0; font-size: 16px; }
  .panel { background: #fff; border: 1px solid #ccc; border-top: none; padding: 24px; }
  .field { margin-bottom: 14px; }
  label { display: block; font-size: 12px; font-weight: bold; margin-bottom: 4px; }
  input { width: 100%; box-sizing: border-box; padding: 8px; font-size: 13px; border: 1px solid #b7bcc2; }
  .note { font-size: 12px; color: #6b6f75; margin-top: 24px; }
</style>
</head>
<body>
<!--
  QA fixture: Taleo/legacy-ATS-style opaque field ids — inputs are named
  and id'd with a generated `ffId_NNNNN` token that carries zero semantic
  meaning on its own. The extension can only resolve these through the
  visible <label>, matching heuristics.test.cjs's "iCIMS / Taleo — id-only
  fields fall back to label" suite (e.g. ffId_10021 + "Phone" -> phone).
-->
<div class="shell">
  <header><h1>Corvallis Materials — Plant Technician</h1></header>
  <div class="panel">
    <div class="field">
      <label for="ffId_10018">First Name</label>
      <input id="ffId_10018" name="ffId_10018" type="text">
    </div>
    <div class="field">
      <label for="ffId_10019">Last Name</label>
      <input id="ffId_10019" name="ffId_10019" type="text">
    </div>
    <div class="field">
      <label for="ffId_10020">Email Address</label>
      <input id="ffId_10020" name="ffId_10020" type="email">
    </div>
    <div class="field">
      <label for="ffId_10021">Phone</label>
      <input id="ffId_10021" name="ffId_10021" type="tel">
    </div>
    <div class="field">
      <label for="ffId_10022">City</label>
      <input id="ffId_10022" name="ffId_10022" type="text">
    </div>
    <p class="note">Static test fixture — nothing here submits anywhere. Field ids are opaque generated tokens; only the &lt;label&gt; text is a usable signal.</p>
  </div>
</div>
</body>
</html>
