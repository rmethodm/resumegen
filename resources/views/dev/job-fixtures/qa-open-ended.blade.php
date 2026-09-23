<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Brightline Analytics — Application Questions (test fixture)</title>
<style>
  body { font-family: Arial, sans-serif; background: #fff; margin: 0; color: #222; }
  .shell { max-width: 640px; margin: 0 auto; padding: 40px 24px 80px; }
  h1 { font-size: 20px; margin-bottom: 24px; }
  .field { margin-bottom: 20px; }
  label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; }
  textarea { width: 100%; box-sizing: border-box; padding: 9px; font-size: 14px; border: 1px solid #c3c3cc; border-radius: 4px; }
  .note { font-size: 12px; color: #777; margin-top: 24px; }
</style>
</head>
<body>
<!--
  QA fixture: genuine screening questions — each a <textarea> with a real
  label (>= 8 chars), none of them cover-letter-shaped, none confidently
  matching a known profile key. Every field here should qualify for
  detectQuestionCandidate() and get a "Draft" affordance from the QA bank.
-->
<div class="shell">
  <h1>Brightline Analytics — Application Questions</h1>
  <form>
    <div class="field">
      <label for="q1">Why do you want to work at Brightline Analytics?</label>
      <textarea id="q1" name="q1" rows="4"></textarea>
    </div>
    <div class="field">
      <label for="q2">Describe a time you had to solve a difficult technical problem.</label>
      <textarea id="q2" name="q2" rows="4"></textarea>
    </div>
    <div class="field">
      <label for="q3">What makes you a strong fit for this role?</label>
      <textarea id="q3" name="q3" rows="4"></textarea>
    </div>
    <div class="field">
      <label for="q4">Tell us about a project you're proud of.</label>
      <textarea id="q4" name="q4" rows="4"></textarea>
    </div>
  </form>
  <p class="note">Static test fixture — nothing here submits anywhere.</p>
</div>
</body>
</html>
