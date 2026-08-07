<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Bluepeak Software — Apply (test fixture)</title>
<style>
  body { font-family: Georgia, 'Times New Roman', serif; background: #fff; margin: 0; color: #222; }
  .shell { max-width: 680px; margin: 0 auto; padding: 40px 24px 80px; }
  h1 { font-size: 22px; margin-bottom: 4px; }
  h2 { font-size: 15px; text-transform: uppercase; letter-spacing: .04em; color: #555; border-bottom: 1px solid #ddd; padding-bottom: 6px; margin: 32px 0 16px; }
  .sub { color: #777; margin-bottom: 32px; font-size: 14px; }
  .field { margin-bottom: 16px; }
  label { display: block; font-size: 13px; font-weight: bold; margin-bottom: 4px; font-family: Arial, sans-serif; }
  label .req { color: #c0392b; }
  input, select, textarea { width: 100%; box-sizing: border-box; padding: 8px; font-size: 14px; border: 1px solid #bbb; font-family: Arial, sans-serif; }
  .dropzone { border: 2px dashed #bbb; border-radius: 4px; padding: 24px; text-align: center; color: #777; font-family: Arial, sans-serif; font-size: 13px; }
  .radio-row { display: flex; gap: 20px; font-family: Arial, sans-serif; font-size: 13px; margin-top: 4px; }
  .radio-row label { display: inline-flex; align-items: center; gap: 6px; font-weight: normal; }
  .help { font-size: 12px; color: #888; font-family: Arial, sans-serif; margin-top: 4px; }
</style>
</head>
<body>
<!--
  QA fixture: Greenhouse-style application form.

  Intentional challenges for Resumegen Apply to exercise:
    1. Rails-style bracketed field names — name="job_application[first_name]"
       etc. — the extension must match on the bracketed name, not just id.
    2. A real <label for="…"> on every field (the easy, well-behaved case).
    3. type="file" resume upload — must be skipped entirely (not fillable).
    4. Cover letter is a *textarea* named ...[cover_letter_text] — should
       land the resume summary text (summary matches "cover letter").
    5. A native <select> for "School" with a real option list, to exercise
       fuzzy option matching (bestOptionMatch) rather than free text.
    6. An EEO "Voluntary Self-Identification" block (gender, race, veteran
       status, disability status) — none of these map to a known profile
       key and must be left on their placeholder/unselected state. This is
       the highest-stakes trap on the page: silently filling protected-class
       fields would be a real bug, not just a cosmetic miss.
    7. A decoy "Desired Salary" number field and "How did you hear about us"
       select — neither should be touched.
-->
<div class="shell">
  <h1>Bluepeak Software</h1>
  <div class="sub">Senior Backend Engineer — Remote (US)</div>

  <form>
    <h2>Your Information</h2>
    <div class="field">
      <label for="first_name">First Name <span class="req">*</span></label>
      <input id="first_name" name="job_application[first_name]" type="text">
    </div>
    <div class="field">
      <label for="last_name">Last Name <span class="req">*</span></label>
      <input id="last_name" name="job_application[last_name]" type="text">
    </div>
    <div class="field">
      <label for="email">Email <span class="req">*</span></label>
      <input id="email" name="job_application[email]" type="email">
    </div>
    <div class="field">
      <label for="phone">Phone</label>
      <input id="phone" name="job_application[phone]" type="tel">
    </div>

    <h2>Resume / CV</h2>
    <div class="field">
      <label for="resume">Attach Resume <span class="req">*</span></label>
      <input id="resume" name="job_application[resume]" type="file">
      <div class="dropzone">Drop a .pdf, .doc, or .docx here — file inputs are never auto-filled.</div>
    </div>

    <div class="field">
      <label for="cover_letter">Cover Letter</label>
      <textarea id="cover_letter" name="job_application[cover_letter_text]" rows="5" placeholder="Paste your cover letter, or write a short note"></textarea>
    </div>

    <h2>Links</h2>
    <div class="field">
      <label for="linkedin">LinkedIn Profile</label>
      <input id="linkedin" name="job_application[urls][LinkedIn]" type="text">
    </div>
    <div class="field">
      <label for="portfolio">Portfolio / Website</label>
      <input id="portfolio" name="job_application[urls][Portfolio]" type="text">
    </div>

    <h2>Education</h2>
    <div class="field">
      <label for="school">School</label>
      <select id="school" name="job_application[education][school]">
        <option value="">Select an option</option>
        <option value="1">Arizona State University</option>
        <option value="2">Georgia Institute of Technology</option>
        <option value="3">University of Michigan</option>
        <option value="4">Purdue University</option>
        <option value="5">Other</option>
      </select>
    </div>
    <div class="field">
      <label for="degree">Degree</label>
      <input id="degree" name="job_application[education][degree]" type="text" placeholder="e.g. B.S. Computer Science">
    </div>

    <h2>Experience</h2>
    <div class="field">
      <label for="cur_title">Current Title</label>
      <input id="cur_title" name="job_application[current_title]" type="text">
    </div>
    <div class="field">
      <label for="cur_employer">Current Employer</label>
      <input id="cur_employer" name="job_application[current_employer]" type="text">
    </div>
    <div class="field">
      <label for="salary">Desired Salary</label>
      <input id="salary" name="job_application[desired_salary]" type="number" placeholder="USD / year">
      <div class="help">Decoy field — no profile key maps to this, should stay blank.</div>
    </div>
    <div class="field">
      <label for="source">How did you hear about us?</label>
      <select id="source" name="job_application[source]">
        <option value="">Select an option</option>
        <option value="1">LinkedIn</option>
        <option value="2">Company Website</option>
        <option value="3">Referral</option>
        <option value="4">Other</option>
      </select>
    </div>

    <h2>Voluntary Self-Identification (EEO)</h2>
    <div class="help" style="margin-bottom: 12px;">Completion is voluntary and will not affect your application. This section must never be auto-filled.</div>
    <div class="field">
      <label for="gender">Gender</label>
      <select id="gender" name="job_application[eeo][gender]">
        <option value="">Select an option</option>
        <option value="male">Male</option>
        <option value="female">Female</option>
        <option value="decline">Decline to self-identify</option>
      </select>
    </div>
    <div class="field">
      <label for="race">Race / Ethnicity</label>
      <select id="race" name="job_application[eeo][race]">
        <option value="">Select an option</option>
        <option value="a">Asian</option>
        <option value="b">Black or African American</option>
        <option value="h">Hispanic or Latino</option>
        <option value="w">White</option>
        <option value="decline">Decline to self-identify</option>
      </select>
    </div>
    <div class="field">
      <label>Veteran Status</label>
      <div class="radio-row">
        <label><input type="radio" name="job_application[eeo][veteran]" value="yes"> I am a veteran</label>
        <label><input type="radio" name="job_application[eeo][veteran]" value="no"> I am not a veteran</label>
        <label><input type="radio" name="job_application[eeo][veteran]" value="decline"> Decline to answer</label>
      </div>
    </div>
    <div class="field">
      <label>Disability Status</label>
      <div class="radio-row">
        <label><input type="radio" name="job_application[eeo][disability]" value="yes"> Yes</label>
        <label><input type="radio" name="job_application[eeo][disability]" value="no"> No</label>
        <label><input type="radio" name="job_application[eeo][disability]" value="decline"> Decline to answer</label>
      </div>
    </div>
  </form>
  <p class="help">Static test fixture — this form does not submit anywhere.</p>
</div>
</body>
</html>
