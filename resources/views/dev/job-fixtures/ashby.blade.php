<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Halcyon Robotics — Apply (test fixture)</title>
<style>
  body { font-family: -apple-system, Arial, sans-serif; background: #fff; margin: 0; color: #191919; }
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
  QA fixture: single full-name field named "_systemfield_name" plus a
  "resume[…]" bracket family for the rest (resume[email], resume[phone],
  resume[org], resume[urls][LinkedIn]) — the exact conventions covered by
  heuristics.test.cjs's "Ashby system fields" suite. Distinct from the
  iCIMS fixture's split systemfield_firstname/lastname naming.
-->
<div class="shell">
  <h1>Halcyon Robotics — Firmware Engineer</h1>
  <form>
    <div class="field">
      <label for="a-name">Full Name</label>
      <input id="a-name" name="_systemfield_name" type="text">
    </div>
    <div class="field">
      <label for="a-email">Email</label>
      <input id="a-email" name="resume[email]" type="email">
    </div>
    <div class="field">
      <label for="a-phone">Phone</label>
      <input id="a-phone" name="resume[phone]" type="tel">
    </div>
    <div class="field">
      <label for="a-org">Current Company</label>
      <input id="a-org" name="resume[org]" type="text">
    </div>
    <div class="field">
      <label for="a-li">LinkedIn</label>
      <input id="a-li" name="resume[urls][LinkedIn]" type="text">
    </div>
  </form>
  <p class="note">Static test fixture — nothing here submits anywhere.</p>
</div>
</body>
</html>
