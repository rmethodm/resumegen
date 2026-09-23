<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Operations Analyst — Kestrel & Co (test fixture)</title>
<style>
  body { font-family: Georgia, serif; background: #fdfaf3; margin: 0; color: #2b2620; }
  .shell { max-width: 680px; margin: 0 auto; padding: 40px 24px 80px; }
  h1 { font-size: 22px; margin-bottom: 4px; }
  .meta { color: #6b6155; margin-bottom: 28px; font-size: 14px; }
  .note { font-size: 12px; color: #8a8071; margin-top: 32px; font-family: Arial, sans-serif; }
</style>
</head>
<body>
<!--
  QA fixture: a job listing page with NO structured data at all — no
  JSON-LD, no microdata, no meta tags. Title, company, and location are
  only present as visible page text in ordinary headings/paragraphs. This
  is the worst case for JD import: the extension has to fall back to
  visible-text extraction (page <h1>, nearby text) instead of a
  structured field.
-->
<div class="shell">
  <h1>Operations Analyst</h1>
  <div class="meta">Kestrel &amp; Co · Denver, CO (Hybrid)</div>
  <p>Kestrel &amp; Co is a boutique logistics consultancy. We're hiring an Operations Analyst to help us build reporting for a growing roster of manufacturing clients.</p>
  <p>What you'll do: build weekly ops dashboards, work directly with client ops leads, own our internal data hygiene process.</p>
  <p>What we're looking for: 2+ years in an operations or analyst role, comfortable in spreadsheets and SQL, clear written communicator.</p>
  <p class="note">Static test fixture — nothing here submits anywhere. No JSON-LD, microdata, or meta tags — plain visible text only.</p>
</div>
</body>
</html>
