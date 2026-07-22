// Pre-push check: renders every page at every breakpoint, asserts no page-level
// horizontal scroll, no JS errors, and that the interactive bits work.
import { chromium } from "/Users/cand0rian/.claude/skills/feature-demo/node_modules/playwright/index.mjs";
const BASE = process.argv[2] || "http://localhost:4321";
const PAGES = ["/", "/glossary.html", "/privacy.html", "/terms.html"];
const WIDTHS = [390, 768, 1024, 1440];
let fail = 0;
const b = await chromium.launch();

for (const page of PAGES) {
  for (const w of WIDTHS) {
    const p = await b.newPage({ viewport: { width: w, height: 900 } });
    const errs = [];
    p.on("pageerror", (e) => errs.push(e.message));
    await p.goto(BASE + page, { waitUntil: "networkidle" });
    await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await p.waitForTimeout(800);
    const r = await p.evaluate(() => ({
      sw: document.documentElement.scrollWidth,
      cw: document.documentElement.clientWidth,
      h: document.documentElement.scrollHeight,
    }));
    const over = r.sw > r.cw + 1;
    if (over || errs.length) fail++;
    console.log(`${page.padEnd(15)} ${String(w).padStart(5)}  h=${String(r.h).padStart(5)}  ${over ? "✗ H-SCROLL" : "✓"}${errs.length ? " ✗ JS: " + errs[0] : ""}`);
    await p.close();
  }
}

// interactions
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(BASE + "/", { waitUntil: "networkidle" });
await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await p.waitForTimeout(1000);
await p.click(".shot-grid img");
await p.waitForTimeout(400);
const opened = await p.evaluate(() => document.getElementById("lightbox").open);
await p.keyboard.press("Escape");
await p.waitForTimeout(300);
const closed = !(await p.evaluate(() => document.getElementById("lightbox").open));
console.log(`lightbox open/close  ${opened && closed ? "✓" : "✗"}`);
if (!(opened && closed)) fail++;

await p.goto(BASE + "/glossary.html", { waitUntil: "networkidle" });
const counts = {};
for (const c of ["all", "routing", "evidence", "cost", "local"]) {
  await p.click(`button[data-cat="${c}"]`);
  counts[c] = await p.$$eval("#terms .term:not([hidden])", (n) => n.length);
}
const ok = counts.all === 18 && counts.routing === 6 && counts.evidence === 5 && counts.cost === 4 && counts.local === 3;
console.log(`glossary filter      ${ok ? "✓" : "✗"} ${JSON.stringify(counts)}`);
if (!ok) fail++;

await p.click('button[data-cat="all"]');        // the loop above left it on "local"
await p.fill("#q", "cache");
const searched = await p.$$eval("#terms .term:not([hidden])", (n) => n.length);
await p.fill("#q", "");
await p.click("#attested-model");
await p.waitForTimeout(300);
const tOpen = await p.evaluate(() => document.getElementById("termbox").open);
await p.click('button[data-goto="decision-id"]');
await p.waitForTimeout(250);
const walked = await p.$eval("#tb-name", (n) => n.textContent) === "Decision id";
await p.keyboard.press("Escape");
await p.waitForTimeout(250);
const tClosed = !(await p.evaluate(() => document.getElementById("termbox").open));
const tOk = searched === 1 && tOpen && walked && tClosed;
console.log(`term search+dialog   ${tOk ? "\u2713" : "\u2717"}`);
if (!tOk) fail++;

await b.close();
console.log(fail ? `\n${fail} FAILURE(S)` : "\nall checks passed");
process.exit(fail ? 1 : 0);
