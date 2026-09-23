<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Thistledown Interiors — Application (test fixture)</title>
<style>
  body { font-family: Arial, sans-serif; background: #fff; margin: 0; color: #222; }
  .shell { max-width: 640px; margin: 0 auto; padding: 40px 24px 80px; }
  h1 { font-size: 20px; margin-bottom: 24px; }
  .field { margin-bottom: 20px; }
  label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; }
  input[type="file"] { width: 100%; box-sizing: border-box; }
  .note { font-size: 12px; color: #777; margin-top: 24px; }
</style>
</head>
<body>
<!--
  QA fixture: two file inputs side by side. "Resume/CV" matches
  RESUME_FILE_KEYWORDS and should be offered as a resume-attach candidate
  via detectFileInputCandidate(). "Cover Letter" is caught by the shared
  isCoverLetterField() boundary and must NOT be offered as a resume
  target — the same hard exclusion used for the QA-draft textarea case,
  applied here to file uploads instead.
-->
<div class="shell">
  <h1>Thistledown Interiors — Junior Designer</h1>
  <form>
    <div class="field">
      <label for="f1">Upload Resume / CV</label>
      <input id="f1" name="resume" type="file">
    </div>
    <div class="field">
      <label for="f2">Upload Cover Letter (optional)</label>
      <input id="f2" name="cover_letter_file" type="file">
    </div>
  </form>
  <p class="note">Static test fixture — nothing here submits anywhere.</p>
</div>
</body>
</html>
