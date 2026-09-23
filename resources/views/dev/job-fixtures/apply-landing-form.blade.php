<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Junction Robotics — Application Form (test fixture)</title>
<style>
  body { font-family: Arial, sans-serif; background: #fff; margin: 0; color: #1d1d22; }
  .shell { max-width: 600px; margin: 0 auto; padding: 40px 24px 80px; }
  h1 { font-size: 20px; margin-bottom: 24px; }
  .field { margin-bottom: 16px; }
  label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 4px; }
  input { width: 100%; box-sizing: border-box; padding: 9px; font-size: 14px; border: 1px solid #c3c3cc; border-radius: 4px; }
  .note { font-size: 12px; color: #777; margin-top: 24px; }
</style>
</head>
<body>
<!--
  QA fixture: the real application form for the apply-landing splash
  page. A genuinely separate document/navigation, not a hidden step in
  the same DOM.
-->
<div class="shell">
  <h1>Junction Robotics — Field Service Technician</h1>
  <form>
    <div class="field">
      <label for="l1">First Name</label>
      <input id="l1" name="first_name" type="text">
    </div>
    <div class="field">
      <label for="l2">Last Name</label>
      <input id="l2" name="last_name" type="text">
    </div>
    <div class="field">
      <label for="l3">Email</label>
      <input id="l3" name="email" type="email">
    </div>
    <div class="field">
      <label for="l4">Phone</label>
      <input id="l4" name="phone" type="tel">
    </div>
  </form>
  <p class="note">Static test fixture — nothing here submits anywhere.</p>
</div>
</body>
</html>
