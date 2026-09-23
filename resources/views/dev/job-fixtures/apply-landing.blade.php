<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Junction Robotics — Careers (test fixture)</title>
<style>
  body { font-family: Arial, sans-serif; background: #f7f7f9; margin: 0; color: #1d1d22; }
  .shell { max-width: 640px; margin: 0 auto; padding: 60px 24px; text-align: center; }
  h1 { font-size: 24px; margin-bottom: 8px; }
  .sub { color: #666; margin-bottom: 32px; }
  a.btn { display: inline-block; background: #002e5d; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-size: 15px; }
  .note { font-size: 12px; color: #777; margin-top: 40px; }
</style>
</head>
<body>
<!--
  QA fixture: a splash/landing page with NO form fields at all — just a
  job title, description blurb, and an "Apply Now" link to a SEPARATE
  real page (apply-landing-form). Pairs with jd-multi-page-application to
  exercise navigation between real documents (not hidden wizard steps in
  the same DOM) — the extension's badge/detection state must re-evaluate
  after a real page load, not assume the form is on the landing page.
-->
<div class="shell">
  <h1>Junction Robotics — Field Service Technician</h1>
  <p class="sub">Junction Robotics builds and maintains agricultural robots across the Midwest.</p>
  <a class="btn" href="{{ route('dev.job-fixtures.show', 'apply-landing-form') }}">Apply Now</a>
  <p class="note">Static test fixture — nothing here submits anywhere. This page has no form; the application form is a separate page.</p>
</div>
</body>
</html>
