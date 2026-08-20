/**
 * Look at the application before shipping it.
 *
 * Two layout defects reached the user this week — the daily plan rendering
 * above the site's own navigation, and the Quant "Open AI Tutor" button that
 * went nowhere. Both built clean and passed every unit test, because neither
 * was a logic error. The only thing that catches them is looking.
 *
 * Renders each surface at three widths, captures a screenshot, and asserts a
 * short list of structural facts that have actually been wrong before.
 *
 *   npm run check:visual            # assert only
 *   npm run check:visual -- --open  # also write screenshots for eyeballing
 */
import { chromium } from 'playwright';
import { mkdirSync, rmSync } from 'node:fs';
import { spawn } from 'node:child_process';

const OUT = 'tmp/visual';
const PORT = 4173;
const BASE = `http://localhost:${PORT}`;
const WIDTHS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'laptop', width: 1024, height: 768 },
  { name: 'mobile', width: 390, height: 844 },
];

const SURFACES = [
  { id: 'home', path: '/' },
  { id: 'quant', path: '/?module=QUANT' },
  { id: 'gk', path: '/?module=GK' },
  { id: 'ca', path: '/?module=CA' },
  { id: 'english', path: '/?module=ENGLISH' },
  { id: 'legal', path: '/?module=LEGAL' },
  { id: 'logical', path: '/?module=LOGICAL' },
  { id: 'mocks', path: '/?module=MOCKS' },
];

// Surfaces with no deep link, reached the way a learner reaches them. The
// student dashboard crashed on a missing import and no check saw it, because
// nothing ever opened it.
const CLICK_THROUGHS = [
  // "My Dashboard" lives in the app header, which the marketing home does not
  // render, so enter from a module page the way a studying learner would.
  { id: 'student', from: '/?module=QUANT', click: 'My Dashboard' },
  { id: 'tutor', from: '/?module=QUANT', click: 'My Dashboard', then: 'Ask my AI tutor' },
];

// Quant is included deliberately: it is the module whose Practice tab already
// worked, so it is the control that proves the check can tell the difference.
const PRACTICE_TABS = [
  { id: 'quant', module: 'QUANT' },
  { id: 'english', module: 'ENGLISH' },
  { id: 'legal', module: 'LEGAL' },
  { id: 'logical', module: 'LOGICAL' },
];

let failures = 0;
const fail = (msg) => { failures += 1; console.log(`  ✗ ${msg}`); };
const pass = (msg) => console.log(`  ✓ ${msg}`);
const check = (ok, msg) => (ok ? pass(msg) : fail(msg));

// The app finishes booting after DOMContentLoaded — auth resolves and the
// router settles, and either can navigate out from under an in-flight
// evaluate. Playwright then throws "Execution context was destroyed", which
// killed roughly half of all runs. Wait for the new context and ask again
// rather than treating the race as a failed assertion.
async function stableEvaluate(page, fn, attempts = 3) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await page.evaluate(fn);
    } catch (error) {
      const raced = /Execution context was destroyed|Target closed|navigating/i.test(error.message);
      if (!raced || attempt >= attempts) throw error;
      await page.waitForLoadState('domcontentloaded').catch(() => {});
      await page.waitForTimeout(500);
    }
  }
}

async function waitForServer(url, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return true;
    } catch { /* not up yet */ }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  return false;
}

// Call the local binary directly: `npx` does not resolve reliably when spawned
// without a shell, and the failure is silent.
const server = spawn(
  process.execPath,
  ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort'],
  { stdio: 'ignore' },
);

try {
  if (!await waitForServer(BASE)) throw new Error(`preview server did not start on ${PORT}`);
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch();

  for (const viewport of WIDTHS) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const consoleErrors = [];
    // Running without production secrets, reCAPTCHA rejects the dummy site key.
    // The failing URL is on the message location, not in its text.
    //
    // reCAPTCHA's own iframe also trips the report-only CSP, and that message
    // names google.com without ever saying "recaptcha" — so it slipped the
    // filter and failed runs at random. Matched on the exact framing text
    // rather than on "report-only", which would hide every CSP report we do
    // want to hear about.
    const LOCAL_ONLY = /recaptcha|dummy-site-key|appcheck|firebase|framing 'https:\/\/www\.google\.com/i;
    page.on('console', (message) => {
      if (message.type() !== 'error') return;
      const where = `${message.text()} ${message.location()?.url || ''}`;
      if (!LOCAL_ONLY.test(where)) consoleErrors.push(message.text());
    });

    console.log(`\n${viewport.name} (${viewport.width}px)`);

    for (const surface of SURFACES) {
      await page.goto(BASE + surface.path, { waitUntil: 'domcontentloaded', timeout: 45_000 });
      await page.waitForTimeout(1200);
      await page.screenshot({ path: `${OUT}/${viewport.name}-${surface.id}.png`, fullPage: false });

      // Nothing may sit outside the viewport horizontally. This is the single
      // most common way a layout breaks and the easiest to miss by eye.
      const overflow = await stableEvaluate(page, () =>
        document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(overflow <= 1, `${surface.id}: no horizontal overflow (${overflow}px)`);

      // The brand must be the first thing on the page. The daily plan once
      // rendered above it.
      const brandIsFirst = await stableEvaluate(page, () => {
        const brand = document.querySelector('.marketing-logo-button, .logo-brand');
        if (!brand) return true;
        const brandTop = brand.getBoundingClientRect().top + window.scrollY;
        // Panels injected by App, not the page's own content. The daily plan
        // once rendered above the site navigation this way.
        const injected = document.querySelectorAll('.daily-plan, .unsaved-progress-banner');
        const earlier = [...injected]
          .filter((node) => node.getBoundingClientRect().height > 40)
          .some((node) => node.getBoundingClientRect().top + window.scrollY < brandTop - 4);
        return !earlier;
      });
      check(brandIsFirst, `${surface.id}: nothing renders above the brand`);

      const mains = await stableEvaluate(page, () => ({
        count: document.querySelectorAll('main').length,
        nested: !!document.querySelector('main main'),
      }));
      check(mains.count === 1 && !mains.nested,
        `${surface.id}: exactly one main landmark (${mains.count}${mains.nested ? ', nested' : ''})`);
    }

    // A crashed module renders the error boundary instead of itself. That is
    // the failure this check exists to catch.
    for (const route of CLICK_THROUGHS) {
      await page.goto(BASE + route.from, { waitUntil: 'domcontentloaded', timeout: 45_000 });
      const entry = page.getByRole('button', { name: new RegExp(route.click, 'i') }).first();
      if (await entry.count() === 0) { check(false, `${route.id}: entry point "${route.click}" not found`); continue; }
      await entry.click();
      await page.waitForTimeout(900);
      if (route.then) {
        const next = page.getByRole('button', { name: new RegExp(route.then, 'i') }).first();
        if (await next.count()) { await next.click(); await page.waitForTimeout(900); }
      }
      await page.screenshot({ path: `${OUT}/${viewport.name}-${route.id}.png` });
      const crashed = await stableEvaluate(page, () =>
        document.body.innerText.includes('temporarily unavailable'));
      check(!crashed, `${route.id}: module renders, no error boundary`);
    }

    // Every module's Practice tab must offer a way in. English, Legal and
    // Logical once rendered topic chips and nothing else: a student who could
    // not already name their weak skill had no route from "I am bad at Legal"
    // to a set of questions. It built clean and no check saw it, because
    // nothing ever opened the tab.
    for (const practice of PRACTICE_TABS) {
      await page.goto(`${BASE}/?module=${practice.module}`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
      await page.waitForTimeout(1200);
      const tab = page.getByRole('button', { name: /^Practice$/i }).first();
      if (await tab.count() === 0) {
        check(false, `${practice.id}: no Practice tab to open`);
        continue;
      }
      await tab.click();
      await page.waitForTimeout(900);
      await page.screenshot({ path: `${OUT}/${viewport.name}-${practice.id}-practice.png`, fullPage: true });

      const lanes = await stableEvaluate(page, () =>
        document.querySelectorAll('.practice-card, .clat-module-paper-card').length);
      check(lanes >= 4, `${practice.id}: Practice offers ${lanes} ways in (needs 4+)`);

      // A lane that starts nothing is worse than no lane: it reads as a
      // working button and silently does nothing.
      const deadButtons = await stableEvaluate(page, () => {
        const cards = [...document.querySelectorAll('.practice-card, .clat-module-paper-card')];
        return cards.filter((card) => !card.querySelector('button')).length;
      });
      check(deadButtons === 0, `${practice.id}: every Practice lane has a control (${deadButtons} without)`);
    }

    // The module rail is the shared shell; if it collapses at the wrong width
    // the modules stop looking like one product.
    await page.goto(`${BASE}/?module=ENGLISH`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await page.waitForTimeout(400);
    const rail = await stableEvaluate(page, () => {
      const el = document.querySelector('.studio-sidebar');
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return { visible: rect.width > 0, width: Math.round(rect.width) };
    });
    if (viewport.width >= 820) {
      check(rail?.visible, `rail visible (${rail?.width}px)`);

      // Between 821px and 1180px the rail collapses to icons. The labels were
      // hidden with display:none, which takes the text out of the
      // accessibility tree as well as off the screen — every module's nav
      // became a column of unnamed buttons on an ordinary laptop.
      const unnamed = await stableEvaluate(page, () => {
        const buttons = [...document.querySelectorAll('.studio-sidebar nav button')];
        return buttons.filter((button) =>
          !(button.getAttribute('aria-label') || button.innerText.trim())).length;
      });
      check(unnamed === 0, `every rail nav button is named (${unnamed} unnamed)`);
    } else {
      check(!rail?.visible, 'rail collapses to the mobile switcher');
    }

    check(consoleErrors.length === 0,
      `no console errors${consoleErrors.length ? `: ${consoleErrors[0].slice(0, 90)}` : ''}`);

    await context.close();
  }

  await browser.close();
} finally {
  server.kill();
}

console.log(failures ? `\n${failures} visual check(s) failed` : '\nAll visual checks passed');
console.log(`Screenshots: ${OUT}/`);
process.exit(failures ? 1 : 0);
