#!/usr/bin/env node
// QA screenshots for a built site: full-page captures at mobile, tablet and
// desktop widths, plus a horizontal-overflow check at each width.
//
// Usage: node screenshot.mjs <url> [out-dir]
//   node .claude/skills/website-builder/scripts/screenshot.mjs http://localhost:3000 .qa/kopi-santai
//
// Needs Playwright with Chromium (`npm i -D playwright && npx playwright install chromium`
// on a local machine; already available in Claude Code cloud sessions).

import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const [url, outArg = ".qa"] = process.argv.slice(2);
if (!url) {
  console.error("Usage: node screenshot.mjs <url> [out-dir]");
  process.exit(2);
}

const outDir = resolve(outArg);
mkdirSync(outDir, { recursive: true });

const viewports = [
  { name: "mobile-375", width: 375, height: 812 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "desktop-1440", width: 1440, height: 900 },
];

const browser = await chromium.launch();
let failed = false;

for (const vp of viewports) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

  await page.goto(url, { waitUntil: "networkidle" });

  // Scroll through the page so scroll-triggered reveals run before capture.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight / 2) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(800);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );

  const file = join(outDir, `${vp.name}.png`);
  await page.screenshot({ path: file, fullPage: true });

  const status = overflow > 0 ? `HORIZONTAL OVERFLOW ${overflow}px` : "ok";
  if (overflow > 0 || errors.length) failed = true;
  console.log(`${vp.name}: ${status} -> ${file}`);
  for (const e of errors) console.log(`  console error: ${e}`);

  await page.close();
}

await browser.close();
process.exit(failed ? 1 : 0);
