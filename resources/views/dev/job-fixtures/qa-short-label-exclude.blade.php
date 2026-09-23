<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Oakhurst Freight — Application (test fixture)</title>
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
  QA fixture: textareas whose visible label is too short to be a real
  question (detectQuestionCandidate rejects labelNorm.length < 8). "Notes"
  (5 chars) and "Info" (4 chars) must NOT get a QA-draft affordance, even
  though they're otherwise plain multi-line free-text fields.
-->
<div class="shell">
  <h1>Oakhurst Freight — Dispatcher</h1>
  <form>
    <div class="field">
      <label for="s1">Notes</label>
      <textarea id="s1" name="s1" rows="3"></textarea>
    </div>
    <div class="field">
      <label for="s2">Info</label>
      <textarea id="s2" name="s2" rows="3"></textarea>
    </div>
    <div class="field">
      <label for="s3">Other</label>
      <textarea id="s3" name="s3" rows="3"></textarea>
    </div>
  </form>
  <p class="note">Static test fixture — nothing here submits anywhere. Labels are all under 8 characters and must not get a QA-draft affordance.</p>
</div>
</body>
</html>
