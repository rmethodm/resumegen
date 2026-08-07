<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Cascade Utilities — Careers (test fixture)</title>
<style>
  body { font-family: Verdana, Geneva, sans-serif; background: #eef1f4; margin: 0; color: #202225; }
  .shell { max-width: 760px; margin: 0 auto; padding: 32px 24px 80px; }
  header { background: #1c4e33; color: #fff; padding: 18px 24px; border-radius: 6px 6px 0 0; }
  header h1 { margin: 0; font-size: 17px; }
  .frame-wrap { background: #fff; border: 1px solid #ccc; border-top: none; border-radius: 0 0 6px 6px; padding: 0; }
  iframe { width: 100%; border: none; display: block; }
  .note { font-size: 12px; color: #6b6f75; margin-top: 24px; }
  .note code { background: #e2e6ea; padding: 1px 5px; border-radius: 3px; }
</style>
</head>
<body>
<!--
  QA fixture: iCIMS-style application, form embedded in an iframe.

  Intentional challenges for Resumegen Apply to exercise:
    1. The whole application form lives inside a SAME-ORIGIN <iframe
       srcdoc="…">, matching how iCIMS embeds its widget on a company's
       own careers page — exercises collectFieldsDeep's same-origin iframe
       walk (frame.contentDocument).
    2. Fields use iCIMS's real naming convention: ids/names like
       "system_systemfield_firstname" — matches the literal
       "_systemfield_firstname" family of regexes in RULES already tuned
       for this ATS.
    3. A SECOND, genuinely cross-origin iframe (a third-party EEO/OFCCP
       disclosure widget hosted on a different domain) sits below the
       form — the extension cannot reach into it and must report it via
       crossOriginFrameCount / "couldn't be reached" messaging rather than
       silently doing nothing.

  Note: the inner form is assigned to the iframe's `srcdoc` property via
  JS (a template literal) rather than written as a static `srcdoc="…"`
  HTML attribute. A static attribute containing a literal "</head>"
  collides with Laravel Boost's dev-only console-log injector, which does
  a raw string-replace for "</head>" anywhere in the response body — it
  matched the one inside the attribute value too and its injected
  `<script id="…">` tag's real double quotes closed the attribute early,
  corrupting the whole document. Setting `.srcdoc` from JS keeps that
  same literal text safely inside a backtick string instead.
-->
<div class="shell">
  <header><h1>Cascade Utilities — Field Engineer, Grid Operations</h1></header>
  <div class="frame-wrap">
    <iframe id="icims_content_iframe" title="Application form" height="900"></iframe>
  </div>

  <h2 style="font-size:13px; text-transform:uppercase; letter-spacing:.04em; color:#555; margin: 28px 0 10px;">EEO / OFCCP Disclosure</h2>
  <div class="frame-wrap">
    <!--
      Genuinely cross-origin (example.com is IANA-reserved for exactly this
      kind of documentation/test use — nothing sensitive is sent to it).
      The extension should count this as an unreachable frame, not silently
      ignore it.
    -->
    <iframe src="https://example.com/eeo-widget" title="EEO disclosure (third-party, cross-origin)" height="160"></iframe>
  </div>

  <p class="note">Static test fixture — nothing here submits anywhere. Form fields live inside <code>#icims_content_iframe</code> (same-origin <code>srcdoc</code>); the EEO block below is a real cross-origin frame.</p>
</div>

<script>
  document.getElementById('icims_content_iframe').srcdoc = `
    <style>
      body { font-family: Verdana, Geneva, sans-serif; margin: 0; padding: 24px; color: #202225; }
      h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .04em; color: #555; border-bottom: 1px solid #ddd; padding-bottom: 6px; margin: 24px 0 14px; }
      .field { margin-bottom: 14px; }
      label { display: block; font-size: 12px; font-weight: bold; margin-bottom: 4px; }
      input, textarea { width: 100%; box-sizing: border-box; padding: 8px; font-size: 13px; border: 1px solid #b7bcc2; }
      .row { display: flex; gap: 14px; }
      .row .field { flex: 1; }
    </style>
      <h2>Personal Information</h2>
      <div class="row">
        <div class="field">
          <label for="system_systemfield_firstname">First Name</label>
          <input id="system_systemfield_firstname" name="system_systemfield_firstname" type="text">
        </div>
        <div class="field">
          <label for="system_systemfield_lastname">Last Name</label>
          <input id="system_systemfield_lastname" name="system_systemfield_lastname" type="text">
        </div>
      </div>
      <div class="row">
        <div class="field">
          <label for="system_systemfield_email">Email</label>
          <input id="system_systemfield_email" name="system_systemfield_email" type="email">
        </div>
        <div class="field">
          <label for="system_systemfield_phone">Phone</label>
          <input id="system_systemfield_phone" name="system_systemfield_phone" type="tel">
        </div>
      </div>
      <div class="field">
        <label for="system_systemfield_location">Location</label>
        <input id="system_systemfield_location" name="system_systemfield_location" type="text" placeholder="City, State">
      </div>

      <h2>Resume &amp; Cover Letter</h2>
      <div class="field">
        <label for="resume_upload">Attach Resume</label>
        <input id="resume_upload" name="resume_upload" type="file">
      </div>
      <div class="field">
        <label for="cover_letter_paste">Paste your cover letter</label>
        <textarea id="cover_letter_paste" name="cover_letter_paste" rows="5"></textarea>
      </div>

      <h2>Referral</h2>
      <div class="field">
        <label for="referral_code">Referral Code (optional)</label>
        <input id="referral_code" name="referral_code" type="text">
      </div>
  `;
</script>
</body>
</html>
