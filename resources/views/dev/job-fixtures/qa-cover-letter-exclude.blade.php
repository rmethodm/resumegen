<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Meridian Health Group — Application (test fixture)</title>
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
  QA fixture: every textarea here is cover-letter-shaped per
  COVER_LETTER_EXCLUDE. Despite otherwise qualifying (textarea, real
  label, no confident profile match), isCoverLetterField() must keep all
  of these OUT of the QA-bank "Draft" affordance — per CLAUDE.md, cover
  letters are a removed feature and there's no UI path to bypass this.
-->
<div class="shell">
  <h1>Meridian Health Group — Application</h1>
  <form>
    <div class="field">
      <label for="cl1">Cover Letter</label>
      <textarea id="cl1" name="cl1" rows="5"></textarea>
    </div>
    <div class="field">
      <label for="cl2">Letter of Interest</label>
      <textarea id="cl2" name="cl2" rows="5"></textarea>
    </div>
    <div class="field">
      <label for="cl3">Motivation Letter</label>
      <textarea id="cl3" name="cl3" rows="5"></textarea>
    </div>
    <div class="field">
      <label for="cl4">Why this letter matters to us — please introduce yourself</label>
      <textarea id="cl4" name="cl4" rows="5"></textarea>
    </div>
  </form>
  <p class="note">Static test fixture — nothing here submits anywhere. All fields are cover-letter-shaped and must never get a QA-draft affordance.</p>
</div>
</body>
</html>
