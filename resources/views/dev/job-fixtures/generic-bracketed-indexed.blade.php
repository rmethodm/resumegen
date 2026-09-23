<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Alderbrook Foods — Apply (test fixture)</title>
<style>
  body { font-family: Arial, sans-serif; background: #f7f7f9; margin: 0; color: #1d1d22; }
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
  QA fixture: array-indexed field names, e.g. name="applicant[0][first_name]"
  — a distinct convention from Greenhouse's job_application[first_name]
  (no leading numeric index there). Exercises that RULES' bracketed-name
  regexes still fire when a numeric array index sits in the middle of the
  name string.
-->
<div class="shell">
  <h1>Alderbrook Foods — Line Cook</h1>
  <form>
    <div class="field">
      <label for="a1">First Name</label>
      <input id="a1" name="applicant[0][first_name]" type="text">
    </div>
    <div class="field">
      <label for="a2">Last Name</label>
      <input id="a2" name="applicant[0][last_name]" type="text">
    </div>
    <div class="field">
      <label for="a3">Email</label>
      <input id="a3" name="applicant[0][email]" type="email">
    </div>
    <div class="field">
      <label for="a4">Phone</label>
      <input id="a4" name="applicant[0][phone]" type="tel">
    </div>
    <div class="field">
      <label for="a5">LinkedIn</label>
      <input id="a5" name="applicant[0][urls][0][linkedin]" type="text">
    </div>
  </form>
  <p class="note">Static test fixture — nothing here submits anywhere. Field names use a numeric-indexed bracket convention (applicant[0][…]).</p>
</div>
</body>
</html>
