<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Ferro & Vance Legal — Apply (test fixture)</title>
<style>
  body { font-family: Arial, sans-serif; background: #fff; margin: 0; color: #222; }
  .shell { max-width: 600px; margin: 0 auto; padding: 40px 24px 80px; }
  h1 { font-size: 20px; margin-bottom: 24px; }
  .note { font-size: 12px; color: #777; margin-top: 24px; }
</style>
</head>
<body>
<!--
  QA fixture: form fields live inside a shadow root NESTED two levels
  deep — a <first-name-host> custom element rendered inside a
  <name-section-host> custom element, both with OPEN shadow roots. This
  is a step past Workday's single-level shadow-DOM case: it exercises
  collectFieldsDeep's shadow walk RECURSING into a shadow root that
  itself contains another shadow host.
-->
<div class="shell">
  <h1>Ferro &amp; Vance Legal — Paralegal</h1>
  <div id="name-section-outer"></div>
  <p class="note">Static test fixture — nothing here submits anywhere. Fields live two shadow-root levels deep.</p>
</div>

<script>
  const outerHost = document.getElementById('name-section-outer');
  const outerShadow = outerHost.attachShadow({ mode: 'open' });
  outerShadow.innerHTML = '<div><first-name-host></first-name-host><email-host></email-host></div>';

  class FirstNameHost extends HTMLElement {
    connectedCallback() {
      const shadow = this.attachShadow({ mode: 'open' });
      shadow.innerHTML = `
        <style>label { display:block; font-size:13px; font-weight:600; margin-bottom:4px; } input { width:100%; box-sizing:border-box; padding:9px; font-size:14px; border:1px solid #c3c3cc; border-radius:4px; margin-bottom:16px; }</style>
        <label for="fn">First Name</label>
        <input id="fn" name="first_name" type="text">
        <label for="ln">Last Name</label>
        <input id="ln" name="last_name" type="text">
      `;
    }
  }
  class EmailHost extends HTMLElement {
    connectedCallback() {
      const shadow = this.attachShadow({ mode: 'open' });
      shadow.innerHTML = `
        <style>label { display:block; font-size:13px; font-weight:600; margin-bottom:4px; } input { width:100%; box-sizing:border-box; padding:9px; font-size:14px; border:1px solid #c3c3cc; border-radius:4px; }</style>
        <label for="em">Email</label>
        <input id="em" name="email" type="email">
      `;
    }
  }
  customElements.define('first-name-host', FirstNameHost);
  customElements.define('email-host', EmailHost);
</script>
</body>
</html>
