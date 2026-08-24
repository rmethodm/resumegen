import { chromium } from 'playwright';
import fs from 'fs';

const base = process.env.LANDING_URL || 'https://resumegen.test/';
const email = process.env.LANDING_USER || 'rmethodm@outlook.com';
const password = process.env.LANDING_PASS;
if (!password) throw new Error('LANDING_PASS required');
const outDir = 'tmp/landing-verify';
const report = { base, checks: [], ok: true };

function assert(name, cond, detail = '') {
  report.checks.push({ name, pass: !!cond, detail });
  if (!cond) report.ok = false;
}

const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
});

async function guestDesktop() {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.waitForSelector('main#main-content');

  const text = await page.locator('body').innerText();
  assert('has Free forever', /free forever/i.test(text));
  assert('has Resumegen', /resumegen/i.test(text));
  assert('no $20', !/\$20/.test(text));
  assert('no Pro plan', !/pro plan/i.test(text));
  assert('no ResumeLM', !/resumelm/i.test(text));

  for (const id of ['features', 'how-it-works', 'about', 'faq']) {
    assert(`section #${id}`, (await page.locator(`#${id}`).count()) === 1);
  }

  const order = await page.evaluate(() =>
    ['features', 'how-it-works', 'about', 'faq']
      .map((id) => document.getElementById(id))
      .filter(Boolean)
      .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1))
      .map((el) => el.id),
  );
  assert('order features before how-it-works', order.indexOf('features') < order.indexOf('how-it-works'), order.join(','));

  // Sticky nav (~56px) + padding — allow generous in-view tolerance
  await page.click('nav[aria-label="Primary"] a[href="#faq"]');
  await page.waitForTimeout(500);
  const faqInView = await page.locator('#faq').evaluate((el) => {
    const r = el.getBoundingClientRect();
    return r.top < window.innerHeight * 0.5 && r.bottom > 0;
  });
  assert('FAQ anchor brings section into view', faqInView);

  await page.click('nav[aria-label="Primary"] a[href="#features"]');
  await page.waitForTimeout(400);
  assert('Features anchor works', await page.locator('#features').evaluate((el) => el.getBoundingClientRect().top < window.innerHeight * 0.5));

  const buttons = page.locator('#faq button');
  assert('FAQ has >=2 items', (await buttons.count()) >= 2);
  await page.locator('#faq').scrollIntoViewIfNeeded();
  await buttons.nth(0).click();
  await page.waitForTimeout(200);
  const opened = await page.locator('#faq').evaluate(() => {
    const panels = [...document.querySelectorAll('#faq [id^="headlessui-disclosure-panel"]')];
    return panels.some((p) => getComputedStyle(p).display !== 'none' && p.textContent.trim().length > 0);
  });
  assert('FAQ item 1 opens', opened);
  await buttons.nth(1).click();
  await page.waitForTimeout(200);
  assert('FAQ item 2 clickable', true);

  const ctaHref = await page.locator('a', { hasText: /Create my resume|Get started/i }).first().getAttribute('href');
  assert('guest CTA to register', !!ctaHref && ctaHref.includes('register'), `href=${ctaHref}`);
  assert('skip link', (await page.locator('a[href="#main-content"]').count()) >= 1);

  // Footer legal resolve
  const privacy = page.locator('footer a', { hasText: 'Privacy' });
  await Promise.all([page.waitForURL(/privacy/i), privacy.click()]);
  assert('Privacy resolves', page.url().toLowerCase().includes('privacy'));
  await page.goto(base, { waitUntil: 'networkidle' });
  const terms = page.locator('footer a', { hasText: 'Terms' });
  await Promise.all([page.waitForURL(/terms/i), terms.click()]);
  assert('Terms resolves', page.url().toLowerCase().includes('terms'));

  await page.goto(base, { waitUntil: 'networkidle' });
  await page.screenshot({ path: `${outDir}/guest-desktop.png`, fullPage: true });
  await page.close();
}

async function guestMobile() {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(base, { waitUntil: 'networkidle' });
  assert('mobile Get started visible', await page.locator('a', { hasText: /Get started/i }).first().isVisible());
  await page.locator('#faq button').first().scrollIntoViewIfNeeded();
  await page.locator('#faq button').first().click();
  await page.waitForTimeout(200);
  assert('mobile FAQ clickable', true);
  // stacked: hero CTA column
  const heroWidth = await page.locator('h1').evaluate((el) => el.getBoundingClientRect().width);
  assert('mobile stacked hero text width', heroWidth > 250 && heroWidth < 390, `w=${heroWidth}`);
  await page.screenshot({ path: `${outDir}/guest-mobile.png`, fullPage: true });
  await page.close();
}

async function loggedIn() {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(new URL('/login', base).toString(), { waitUntil: 'networkidle' });
  await page.fill('input[type="email"], input[name="email"]', email);
  await page.fill('input[type="password"], input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1500);
  // May land on dashboard or 2FA — go to landing
  await page.goto(base, { waitUntil: 'networkidle' });
  const goApp = page.locator('a', { hasText: /Go to app/i }).first();
  const visible = await goApp.isVisible().catch(() => false);
  assert('logged-in shows Go to app', visible);
  if (visible) {
    const href = await goApp.getAttribute('href');
    assert('Go to app → dashboard', !!href && href.includes('dashboard'), `href=${href}`);
  }
  await page.screenshot({ path: `${outDir}/logged-in-desktop.png`, fullPage: true });
  await page.close();
}

try {
  await guestDesktop();
  await guestMobile();
  await loggedIn();
} catch (e) {
  report.ok = false;
  report.error = String(e);
  console.error(e);
} finally {
  await browser.close();
}

fs.writeFileSync(`${outDir}/report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
