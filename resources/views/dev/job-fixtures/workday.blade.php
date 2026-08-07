<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Northwind Robotics — Careers (test fixture)</title>
<style>
  body { font-family: -apple-system, Arial, sans-serif; background: #f4f4f6; margin: 0; color: #1a1a2e; }
  .shell { max-width: 720px; margin: 0 auto; background: #fff; min-height: 100vh; box-shadow: 0 0 20px rgba(0,0,0,.05); }
  header { background: #002e5d; color: #fff; padding: 20px 32px; }
  header h1 { margin: 0; font-size: 18px; }
  .steps { display: flex; gap: 0; padding: 16px 32px 0; border-bottom: 1px solid #e2e2ea; }
  .steps span { padding: 8px 16px; font-size: 13px; color: #8a8a99; border-bottom: 3px solid transparent; }
  .steps span.active { color: #002e5d; font-weight: 600; border-color: #002e5d; }
  .panel { padding: 24px 32px 48px; }
  fieldset { border: none; margin: 0 0 28px; padding: 0; }
  legend { font-size: 15px; font-weight: 700; margin-bottom: 12px; padding: 0; }
  .row { display: flex; gap: 16px; margin-bottom: 14px; }
  .field { flex: 1; display: flex; flex-direction: column; gap: 4px; position: relative; }
  label { font-size: 12px; font-weight: 600; color: #4a4a5a; }
  input, select, textarea { font-size: 14px; padding: 9px 10px; border: 1px solid #c7c7d1; border-radius: 4px; font-family: inherit; }
  .listbox { position: absolute; top: 100%; left: 0; right: 0; z-index: 5; background: #fff; border: 1px solid #c7c7d1; border-top: none; border-radius: 0 0 4px 4px; list-style: none; margin: 0; padding: 4px 0; max-height: 160px; overflow: auto; }
  .listbox li { padding: 7px 10px; cursor: pointer; }
  .listbox li:hover { background: #eef2fb; }
  .note { font-size: 12px; color: #8a8a99; margin-top: 24px; }
</style>
</head>
<body>
<!--
  QA fixture: Workday-style application flow.

  Intentional challenges for Resumegen Apply to exercise:
    1. data-automation-id naming (Workday's real convention) instead of
       useful name/id attributes — "legalNameSection_firstName" /
       "legalNameSection_lastName" exactly match the literal RULES regex
       for first/last name.
    2. Phone number field lives inside an OPEN shadow root (a <phone-field>
       host element) — exercises collectFieldsDeep's shadow-DOM walk.
    3. "Current Location" is a WAI-ARIA combobox (role=combobox +
       aria-controls listbox) backed by a rendered <ul role="listbox">, not
       a native <select> — exercises isComboboxTrigger / trySelectComboboxOption.
    4. "How Did You Hear About Us" is a plain decoy <select> with no
       matching profile key — must stay untouched.
    5. Steps 2 ("My Experience") and 3 ("Application Questions") are
       present in the DOM but marked hidden, mirroring how Workday keeps
       inactive wizard steps mounted — those fields (current title/company,
       summary, skills) must NOT be filled while on step 1.
-->
<div class="shell">
  <header><h1>Northwind Robotics — Apply for Robotics Software Engineer</h1></header>
  <div class="steps">
    <span class="active">1. My Information</span>
    <span>2. My Experience</span>
    <span>3. Application Questions</span>
  </div>

  <div class="panel">
    <!-- STEP 1 — visible -->
    <section id="step-1">
      <fieldset>
        <legend>Legal Name</legend>
        <div class="row">
          <div class="field">
            <label for="input-firstName">First Name</label>
            <input id="input-firstName" data-automation-id="legalNameSection_firstName" name="legalNameSection_firstName" type="text" required>
          </div>
          <div class="field">
            <label for="input-lastName">Last Name</label>
            <input id="input-lastName" data-automation-id="legalNameSection_lastName" name="legalNameSection_lastName" type="text" required>
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend>Contact Information</legend>
        <div class="row">
          <div class="field">
            <label for="input-email">Email Address</label>
            <input id="input-email" data-automation-id="email" name="email" type="email" required>
          </div>
          <div class="field">
            <label>Phone Number</label>
            <!-- Real input is rendered inside an open shadow root below -->
            <div id="phone-host"></div>
          </div>
        </div>

        <div class="row">
          <div class="field">
            <label id="location-label" for="input-location">Current Location</label>
            <input
              id="input-location"
              type="text"
              role="combobox"
              aria-autocomplete="list"
              aria-haspopup="listbox"
              aria-controls="location-listbox"
              aria-labelledby="location-label"
              autocomplete="off"
              placeholder="Search city…">
            <ul class="listbox" role="listbox" id="location-listbox" hidden>
              <li role="option" data-value="Austin, TX">Austin, TX</li>
              <li role="option" data-value="Chicago, IL">Chicago, IL</li>
              <li role="option" data-value="Remote - United States">Remote - United States</li>
              <li role="option" data-value="New York, NY">New York, NY</li>
              <li role="option" data-value="Seattle, WA">Seattle, WA</li>
            </ul>
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend>Social Links</legend>
        <div class="row">
          <div class="field">
            <label for="input-linkedin">LinkedIn Profile</label>
            <input id="input-linkedin" data-automation-id="linkedin" name="linkedin" type="text" placeholder="linkedin.com/in/…">
          </div>
          <div class="field">
            <label for="input-website">Personal Website</label>
            <input id="input-website" data-automation-id="website" name="website" type="text" placeholder="https://…">
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend>Source</legend>
        <div class="row">
          <div class="field">
            <label for="input-source">How Did You Hear About Us?</label>
            <!-- Decoy: no matching profile key, must stay on the placeholder option -->
            <select id="input-source" name="source">
              <option value="">— Select —</option>
              <option value="referral">Employee Referral</option>
              <option value="job_board">Job Board</option>
              <option value="conference">Conference</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </fieldset>
    </section>

    <!-- STEP 2 — mounted, but inactive: must NOT be filled from step 1 -->
    <section id="step-2" hidden aria-hidden="true">
      <fieldset>
        <legend>My Experience</legend>
        <div class="row">
          <div class="field">
            <label for="input-title">Current Job Title</label>
            <input id="input-title" data-automation-id="jobTitle" name="jobTitle" type="text">
          </div>
          <div class="field">
            <label for="input-company">Current Employer</label>
            <input id="input-company" data-automation-id="employerName" name="employerName" type="text">
          </div>
        </div>
        <div class="row">
          <div class="field" style="flex: 2;">
            <label for="input-summary">Additional Information</label>
            <textarea id="input-summary" data-automation-id="additionalInformation" name="additionalInformation" rows="4"></textarea>
          </div>
        </div>
      </fieldset>
    </section>

    <!-- STEP 3 — mounted, but inactive -->
    <section id="step-3" hidden aria-hidden="true">
      <fieldset>
        <legend>Application Questions</legend>
        <div class="row">
          <div class="field" style="flex: 2;">
            <label for="input-skills">Key Skills</label>
            <input id="input-skills" data-automation-id="skillsQuestion" name="skillsQuestion" type="text">
          </div>
        </div>
      </fieldset>
    </section>

    <p class="note">This is a static test fixture — nothing here submits anywhere.</p>
  </div>
</div>

<script>
  // Phone field lives in an OPEN shadow root, mirroring Workday's Lit-style
  // custom elements — content scripts must walk shadowRoot to find it.
  const phoneHost = document.getElementById('phone-host');
  const phoneShadow = phoneHost.attachShadow({ mode: 'open' });
  phoneShadow.innerHTML = `
    <style>input { font: inherit; padding: 9px 10px; border: 1px solid #c7c7d1; border-radius: 4px; width: 100%; box-sizing: border-box; }</style>
    <input id="phoneInput" data-automation-id="phoneNumber-input" name="phoneNumber" type="tel" placeholder="(555) 555-5555">
  `;

  // Minimal combobox behavior so a human tester can see it work too.
  const locInput = document.getElementById('input-location');
  const listbox = document.getElementById('location-listbox');
  const showListbox = () => { listbox.hidden = false; };
  const hideListbox = () => { listbox.hidden = true; };
  locInput.addEventListener('focus', showListbox);
  locInput.addEventListener('input', showListbox);
  listbox.addEventListener('mousedown', (e) => {
    const opt = e.target.closest('[role="option"]');
    if (opt) {
      locInput.value = opt.dataset.value;
      hideListbox();
    }
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#input-location') && !e.target.closest('#location-listbox')) {
      hideListbox();
    }
  });
</script>
</body>
</html>
