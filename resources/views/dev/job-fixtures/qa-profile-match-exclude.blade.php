<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Cinderwood Studios — Application (test fixture)</title>
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
  QA fixture: textareas that DO confidently match a known profile key
  ("Professional Summary" -> summary, "Key Skills" -> skills). Their
  claimedScore should land >= 40, so detectQuestionCandidate() must treat
  these as ordinary autofill/Insert targets, not draft them as screening
  questions. A true screening question (bottom of the page) is included
  for contrast — it should still get the Draft affordance.
-->
<div class="shell">
  <h1>Cinderwood Studios — Technical Artist</h1>
  <form>
    <div class="field">
      <label for="p1">Professional Summary</label>
      <textarea id="p1" name="summary" rows="4"></textarea>
    </div>
    <div class="field">
      <label for="p2">Key Skills</label>
      <textarea id="p2" name="skills" rows="4"></textarea>
    </div>
    <div class="field">
      <label for="p3">What excites you about working in games?</label>
      <textarea id="p3" name="q3" rows="4"></textarea>
    </div>
  </form>
  <p class="note">Static test fixture — nothing here submits anywhere. Summary/Skills should autofill directly, not offer a QA draft.</p>
</div>
</body>
</html>
