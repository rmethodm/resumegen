<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Marlow &amp; Finch Studio — Join Us (test fixture)</title>
<style>
  body { font-family: 'Courier New', monospace; background: #fdfaf3; margin: 0; color: #2b2620; }
  .shell { max-width: 640px; margin: 0 auto; padding: 48px 24px 96px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .sub { color: #6b6155; margin-bottom: 32px; font-size: 13px; }
  .field { margin-bottom: 18px; position: relative; }
  label { display: block; font-size: 13px; margin-bottom: 5px; }
  input, select, textarea { width: 100%; box-sizing: border-box; padding: 9px; font-size: 14px; border: 1px solid #a89f8f; background: #fff; font-family: inherit; }
  .hint { font-size: 11px; color: #8a8071; margin-top: 3px; }
  .flag { font-size: 11px; color: #a3541f; margin-top: 3px; font-weight: bold; }
  .listbox { position: absolute; top: 100%; left: 0; right: 0; z-index: 5; background: #fff; border: 1px solid #a89f8f; border-top: none; list-style: none; margin: 0; padding: 4px 0; max-height: 140px; overflow: auto; }
  .listbox li { padding: 6px 9px; cursor: pointer; }
  .listbox li:hover { background: #f1ece0; }
  h2 { font-size: 12px; text-transform: uppercase; letter-spacing: .06em; color: #8a8071; border-bottom: 1px solid #e2dccb; padding-bottom: 6px; margin: 30px 0 14px; }
  .upload { border: 1px dashed #a89f8f; padding: 16px; text-align: center; font-size: 13px; color: #6b6155; }
  .checkbox-row { display: flex; align-items: flex-start; gap: 8px; font-size: 12px; }
</style>
</head>
<body>
<!--
  QA fixture: small, hand-built company careers page (no ATS vendor at
  all) — the worst case for field-matching, since there are no name/id
  conventions or autocomplete hints to lean on, only visible label text.

  Intentional challenges for Resumegen Apply to exercise:
    1. Label wording that deliberately avoids the obvious tokens:
       "Given Name" / "Family Name" instead of "First/Last Name" (both
       ARE covered by RULES' label regexes — should still pass).
    2. A "Confirm Email Address" field directly under the real email
       field — must stay empty (the email exclude regex for "confirm").
    3. An "Account Username" field that carries autocomplete="username".
       This is a KNOWN GAP worth watching manually: RULES treats
       autocomplete="username" as a strong email signal (some login-style
       forms reuse it that way), and the current scoreField logic only
       discounts the "contains the word username" penalty when there's NO
       autocomplete hit — so this field may get the applicant's email
       filled into what is actually meant to be a distinct account
       username. Flagged here rather than "fixed" so it surfaces in
       testing instead of being silently avoided.
    4. "Where are you currently based?" for location — the extra word
       "currently" between "are you" and "based" breaks RULES' location
       label regex (\bwhere\s*(are you|do you)\s*(based|live|located)\b
       requires them adjacent). Expected to NOT match — a real heuristic
       gap, not a fixture bug.
    5. A custom ARIA combobox for "State / Province" with no matching
       profile key — must be left alone, same as the decoy selects on the
       other fixtures, but here it's a bespoke widget instead of Workday's.
    6. Resume upload has no <label> at all, only aria-label — file inputs
       are excluded from isFillableControl anyway, but confirms label
       detection doesn't crash without one.
    7. "I agree to the Terms & Privacy Policy" checkbox — must never be
       touched.
-->
<div class="shell">
  <h1>Marlow &amp; Finch Studio</h1>
  <div class="sub">We're a 12-person design studio. Tell us about yourself.</div>

  <form>
    <h2>About You</h2>
    <div class="field">
      <label for="f1">Given Name</label>
      <input id="f1" type="text">
    </div>
    <div class="field">
      <label for="f2">Family Name</label>
      <input id="f2" type="text">
    </div>
    <div class="field">
      <label for="f3">Email Address</label>
      <input id="f3" type="text" placeholder="you@example.com">
    </div>
    <div class="field">
      <label for="f4">Confirm Email Address</label>
      <input id="f4" type="text" placeholder="Type it again">
      <div class="hint">Trap: must stay empty.</div>
    </div>
    <div class="field">
      <label for="f5">Account Username</label>
      <input id="f5" type="text" autocomplete="username" placeholder="For your applicant portal login">
      <div class="flag">Known heuristic gap — watch this one manually (see comment at top of file).</div>
    </div>
    <div class="field">
      <label for="f6">Contact Number</label>
      <input id="f6" type="text" placeholder="With area code">
    </div>
    <div class="field">
      <label for="f7">Where are you currently based?</label>
      <input id="f7" type="text" placeholder="City, Country">
      <div class="hint">Edge case: extra word "currently" is expected to break the location-label match.</div>
    </div>
    <div class="field">
      <label for="f8" id="f8-label">State / Province</label>
      <input id="f8" type="text" role="combobox" aria-autocomplete="list" aria-haspopup="listbox" aria-controls="f8-listbox" aria-labelledby="f8-label" autocomplete="off">
      <ul class="listbox" role="listbox" id="f8-listbox" hidden>
        <li role="option">California</li>
        <li role="option">Texas</li>
        <li role="option">Ontario</li>
        <li role="option">New York</li>
      </ul>
      <div class="hint">Decoy custom widget — no matching profile key.</div>
    </div>

    <h2>Links &amp; Background</h2>
    <div class="field">
      <label for="f9">Portfolio / GitHub</label>
      <input id="f9" type="text" placeholder="Link to recent work">
    </div>
    <div class="field">
      <label for="f10">Current Job Title</label>
      <input id="f10" type="text">
    </div>
    <div class="field">
      <label for="f11">Current Company</label>
      <input id="f11" type="text">
    </div>
    <div class="field">
      <label for="f12">School Attended</label>
      <input id="f12" type="text">
    </div>
    <div class="field">
      <label for="f13">Degree / Major</label>
      <input id="f13" type="text">
    </div>
    <div class="field">
      <label for="f14">A Few Sentences About Yourself</label>
      <textarea id="f14" rows="4"></textarea>
    </div>

    <h2>Resume</h2>
    <div class="upload">
      <input type="file" aria-label="Upload your resume (PDF, DOC, or DOCX)">
      <div class="hint">No visible &lt;label&gt; on purpose — aria-label only.</div>
    </div>

    <div class="field checkbox-row" style="margin-top: 24px;">
      <input type="checkbox" id="terms">
      <label for="terms" style="margin: 0;">I agree to the Terms &amp; Privacy Policy</label>
    </div>
  </form>
  <p class="hint" style="margin-top: 24px;">Static test fixture — this form does not submit anywhere.</p>
</div>

<script>
  const input = document.getElementById('f8');
  const listbox = document.getElementById('f8-listbox');
  input.addEventListener('focus', () => { listbox.hidden = false; });
  input.addEventListener('input', () => { listbox.hidden = false; });
  listbox.addEventListener('mousedown', (e) => {
    const opt = e.target.closest('[role="option"]');
    if (opt) {
      input.value = opt.textContent;
      listbox.hidden = true;
    }
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#f8') && !e.target.closest('#f8-listbox')) {
      listbox.hidden = true;
    }
  });
</script>
</body>
</html>
