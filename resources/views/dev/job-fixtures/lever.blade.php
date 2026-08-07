<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Fernwood Analytics — Apply (test fixture)</title>
<style>
  body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #fafafa; margin: 0; color: #17171a; }
  .shell { max-width: 620px; margin: 0 auto; padding: 48px 24px 96px; }
  h1 { font-size: 24px; margin: 0 0 2px; }
  .sub { color: #6b6b76; margin-bottom: 36px; font-size: 14px; }
  .field { margin-bottom: 18px; }
  label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; }
  input, textarea { width: 100%; box-sizing: border-box; padding: 10px 12px; font-size: 14px; border: 1px solid #d6d6dc; border-radius: 6px; font-family: inherit; }
  .rich-editor { min-height: 100px; padding: 10px 12px; border: 1px solid #d6d6dc; border-radius: 6px; font-size: 14px; line-height: 1.5; }
  .rich-editor:empty:before { content: attr(data-placeholder); color: #9a9aa4; }
  .upload-row { display: flex; align-items: center; gap: 12px; padding: 14px; border: 1px solid #d6d6dc; border-radius: 6px; font-size: 13px; color: #6b6b76; }
  .upload-row button { font-size: 13px; padding: 6px 12px; border-radius: 4px; border: 1px solid #d6d6dc; background: #fff; }
  .checkbox-row { display: flex; align-items: center; gap: 8px; font-size: 13px; }
  h2 { font-size: 12px; text-transform: uppercase; letter-spacing: .06em; color: #9a9aa4; margin: 32px 0 14px; }
</style>
</head>
<body>
<!--
  QA fixture: Lever-style application form.

  Intentional challenges for Resumegen Apply to exercise:
    1. A SINGLE "Full Name" field (name="name") instead of split first/last
       — the full_name key must win here without a first/last split. This
       is the inverse case from the Workday/Greenhouse fixtures.
    2. "Additional Information" is a contenteditable rich-text div, not a
       <textarea> — exercises setFieldValue's isContentEditable branch.
    3. Two candidate "website"-shaped fields (GitHub and Portfolio) exist,
       but the profile only has one website value — exactly one of them
       should be filled (matchFields' one-value-per-key, first-best-match
       behavior), the other must stay empty rather than both getting the
       same URL.
    4. A "Twitter / X" link field has no matching profile key and is a
       pure decoy — must stay empty.
    5. "Currently employed here?" checkbox is unrelated to any profile
       field (checkboxes are excluded from isFillableControl entirely) —
       confirms the extension doesn't touch it.
-->
<div class="shell">
  <h1>Fernwood Analytics</h1>
  <div class="sub">Data Platform Engineer · Fernwood Analytics is hiring — Remote</div>

  <form>
    <div class="field">
      <label for="name">Full Name</label>
      <input id="name" name="name" type="text">
    </div>
    <div class="field">
      <label for="email">Email</label>
      <input id="email" name="email" type="email">
    </div>
    <div class="field">
      <label for="phone">Phone</label>
      <input id="phone" name="phone" type="tel">
    </div>
    <div class="field">
      <label for="location">Current location</label>
      <input id="location" name="location" type="text" placeholder="City, State">
    </div>

    <h2>Resume</h2>
    <div class="upload-row">
      <span>No file selected.</span>
      <button type="button">Upload resume/CV</button>
      <input id="resume" name="resume" type="file" style="display:none;">
    </div>

    <h2>Links</h2>
    <div class="field">
      <label for="urls-linkedin">LinkedIn</label>
      <input id="urls-linkedin" name="urls[LinkedIn]" type="text" placeholder="https://linkedin.com/in/…">
    </div>
    <div class="field">
      <label for="urls-github">GitHub</label>
      <input id="urls-github" name="urls[GitHub]" type="text" placeholder="https://github.com/…">
    </div>
    <div class="field">
      <label for="urls-portfolio">Portfolio</label>
      <input id="urls-portfolio" name="urls[Portfolio]" type="text" placeholder="https://…">
    </div>
    <div class="field">
      <label for="urls-twitter">Twitter / X</label>
      <input id="urls-twitter" name="urls[Twitter]" type="text" placeholder="https://x.com/…">
    </div>

    <h2>Additional Information</h2>
    <div class="field">
      <label for="additional-info">Anything else you'd like to share?</label>
      <div id="additional-info" class="rich-editor" contenteditable="true" role="textbox" aria-label="Additional Information" data-placeholder="Write something…"></div>
    </div>

    <div class="field checkbox-row">
      <input type="checkbox" id="currently-employed" name="currently_employed">
      <label for="currently-employed" style="margin: 0; font-weight: normal;">I currently work at Fernwood Analytics</label>
    </div>
  </form>
  <p style="color:#9a9aa4; font-size: 12px;">Static test fixture — this form does not submit anywhere.</p>
</div>
</body>
</html>
