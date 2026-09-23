<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Senior Product Designer — Waystone Robotics (test fixture)</title>
<script type="application/ld+json">
{
  "@@context": "https://schema.org/",
  "@@type": "JobPosting",
  "title": "Senior Product Designer",
  "description": "<p>Waystone Robotics is looking for a Senior Product Designer to own the end-to-end experience of our warehouse automation console. You'll partner with engineering and ops to ship interfaces used by thousands of operators daily.</p><p>Requirements: 5+ years product design, strong systems-thinking, comfort with B2B/industrial software.</p>",
  "hiringOrganization": {
    "@@type": "Organization",
    "name": "Waystone Robotics",
    "sameAs": "https://waystonerobotics.example"
  },
  "jobLocation": {
    "@@type": "Place",
    "address": { "@@type": "PostalAddress", "addressLocality": "Remote", "addressCountry": "US" }
  },
  "datePosted": "2026-08-01",
  "employmentType": "FULL_TIME"
}
</script>
<style>
  body { font-family: Arial, sans-serif; background: #fff; margin: 0; color: #222; }
  .shell { max-width: 680px; margin: 0 auto; padding: 40px 24px 80px; }
  h1 { font-size: 22px; margin-bottom: 4px; }
  .company { color: #666; margin-bottom: 28px; }
  .note { font-size: 12px; color: #777; margin-top: 32px; }
</style>
</head>
<body>
<!--
  QA fixture: a job LISTING page (not an application form) carrying a
  schema.org JobPosting via JSON-LD, mirroring how Greenhouse's public
  board pages embed structured data. Exercises the extension's "Add job" /
  JD-import path: right-click "Import job description" should pull
  title/company/description straight from the JSON-LD rather than
  scraping visible text.
-->
<div class="shell">
  <h1>Senior Product Designer</h1>
  <div class="company">Waystone Robotics · Remote (US)</div>
  <p>Waystone Robotics is looking for a Senior Product Designer to own the end-to-end experience of our warehouse automation console. You'll partner with engineering and ops to ship interfaces used by thousands of operators daily.</p>
  <p>Requirements: 5+ years product design, strong systems-thinking, comfort with B2B/industrial software.</p>
  <p class="note">Static test fixture — nothing here submits anywhere. Structured data is in a &lt;script type="application/ld+json"&gt; tag in &lt;head&gt;.</p>
</div>
</body>
</html>
