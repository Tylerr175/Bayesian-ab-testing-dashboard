/**
 * CDP-based screenshot script for BayesLab.
 * Uses Node 22+ built-in WebSocket — no npm deps needed.
 * Takes three screenshots: form (light), form (dark), results (dark).
 */

import { spawn, execSync } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import http from 'http';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'docs', 'screenshots');
mkdirSync(OUT, { recursive: true });

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9223;
const URL = 'http://localhost:3000';

// ── CDP helpers ───────────────────────────────────────────────────────────────

function cdpFetch(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:${PORT}${path}`, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

class CDPSession {
  constructor(wsUrl) {
    this._ws = new WebSocket(wsUrl);
    this._id = 0;
    this._pending = new Map();
    this._ws.onmessage = e => {
      const msg = JSON.parse(e.data);
      if (msg.id !== undefined) {
        const cb = this._pending.get(msg.id);
        if (cb) { this._pending.delete(msg.id); cb(msg); }
      }
    };
  }

  ready() {
    return new Promise((resolve, reject) => {
      if (this._ws.readyState === WebSocket.OPEN) { resolve(); return; }
      this._ws.onopen = resolve;
      this._ws.onerror = reject;
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this._id;
      this._pending.set(id, msg => {
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      });
      this._ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async screenshot() {
    const { data } = await this.send('Page.captureScreenshot', { format: 'png' });
    return Buffer.from(data, 'base64');
  }

  async eval(expression) {
    return this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
  }

  close() { this._ws.close(); }
}

// ── Launch Chrome ─────────────────────────────────────────────────────────────

async function launchChrome() {
  const proc = spawn(CHROME, [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1440,900',
    '--hide-scrollbars',
    '--user-data-dir=/tmp/chrome-screenshot-profile',
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank',
  ], { stdio: 'ignore' });

  // Wait for debugging port to become ready
  for (let i = 0; i < 30; i++) {
    await sleep(300);
    try {
      await cdpFetch('/json/version');
      break;
    } catch {}
  }
  return proc;
}

// ── CDP input helpers ─────────────────────────────────────────────────────────

async function clickElement(session, jsExpr) {
  const res = await session.eval(`
    (function() {
      const el = ${jsExpr};
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return JSON.stringify({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
    })()
  `);
  if (!res?.result?.value) throw new Error('Element not found: ' + jsExpr);
  const { x, y } = JSON.parse(res.result.value);
  await session.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await session.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  return { x, y };
}

async function clearAndType(session, jsExpr, text) {
  const { x, y } = await clickElement(session, jsExpr);
  await sleep(80);
  // Use JS to focus + select all existing content, then insertText replaces the selection
  await session.eval(`
    (function() {
      const el = ${jsExpr};
      el.focus();
      el.select();           // selects all text in the input
    })()
  `);
  await sleep(50);
  await session.send('Input.insertText', { text });
  await sleep(80);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  console.log('Launching Chrome...');
  const proc = await launchChrome();

  try {
    const targets = await cdpFetch('/json');
    const target = targets.find(t => t.type === 'page') ?? targets[0];
    const session = new CDPSession(target.webSocketDebuggerUrl);
    await session.ready();

    await session.send('Page.enable');
    await session.send('Emulation.setDeviceMetricsOverride', {
      width: 1440, height: 900, deviceScaleFactor: 1, mobile: false,
    });

    // ── 1. Form screenshot (light) ────────────────────────────────────────────
    console.log('Navigating to page...');
    await session.send('Page.navigate', { url: URL });
    await sleep(2500);

    // Scroll to the tool section
    await session.eval(`document.querySelector('#try-it')?.scrollIntoView({ behavior: 'instant' })`);
    await sleep(600);

    writeFileSync(join(OUT, 'analysis-form-light.png'), await session.screenshot());
    console.log('Saved analysis-form-light.png');

    // ── 2. Form screenshot (dark) ─────────────────────────────────────────────
    await session.eval(`document.documentElement.classList.add('dark'); localStorage.setItem('theme','dark');`);
    await sleep(300);
    writeFileSync(join(OUT, 'analysis-form-dark.png'), await session.screenshot());
    console.log('Saved analysis-form-dark.png');

    // ── 3. Results screenshot (dark) — fill form + submit ─────────────────────
    console.log('Filling form...');

    // Name inputs: aria-label="Variant name"  (index 0 = A, index 1 = B)
    // Number inputs: inputmode="numeric"  order: [A visitors, A conversions, B visitors, B conversions]
    await clearAndType(session, `document.querySelectorAll('input[aria-label="Variant name"]')[0]`, 'Control');
    await clearAndType(session, `document.querySelectorAll('input[inputmode="numeric"]')[0]`, '12400');
    await clearAndType(session, `document.querySelectorAll('input[inputmode="numeric"]')[1]`, '1054');
    await clearAndType(session, `document.querySelectorAll('input[aria-label="Variant name"]')[1]`, 'New Design');
    await clearAndType(session, `document.querySelectorAll('input[inputmode="numeric"]')[2]`, '12150');
    await clearAndType(session, `document.querySelectorAll('input[inputmode="numeric"]')[3]`, '1287');

    console.log('Form filled — submitting...');
    await clickElement(session, `document.querySelector('button[type="submit"]')`);
    console.log('Submitted — waiting for results...');

    // Poll for results panel (up to 10s) — look for text only in results
    for (let i = 0; i < 20; i++) {
      await sleep(500);
      const found = await session.eval(`document.body.innerText.includes('Expected loss') || document.body.innerText.includes('Probability best') || document.body.innerText.includes('prob_best')`);
      if (found?.result?.value) { console.log('Results detected after', (i + 1) * 0.5, 's'); break; }
    }
    await sleep(600);

    // Scroll to the recharts wrapper, then nudge up to also capture the recommendation banner above it
    await session.eval(`
      const chart = document.querySelector('.recharts-wrapper');
      if (chart) chart.scrollIntoView({ behavior: 'instant', block: 'end' });
      else window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' });
    `);
    await session.eval(`window.scrollBy({ top: 80, behavior: 'instant' })`);
    await sleep(500);

    writeFileSync(join(OUT, 'results-dark.png'), await session.screenshot());
    console.log('Saved results-dark.png');

    // ── 4. Results screenshot (light) ─────────────────────────────────────────
    await session.eval(`document.documentElement.classList.remove('dark'); localStorage.setItem('theme','light');`);
    await sleep(300);
    writeFileSync(join(OUT, 'results-light.png'), await session.screenshot());
    console.log('Saved results-light.png');

    session.close();
  } finally {
    proc.kill();
    console.log('Done.');
  }
}

run().catch(err => { console.error(err); process.exit(1); });
