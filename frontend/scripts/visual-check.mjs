import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile } from "node:fs/promises";

const output = new URL("../../docs/screenshots/", import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 1080 },
  deviceScaleFactor: 1,
  reducedMotion: "reduce",
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
await page.goto("http://127.0.0.1:5173/");
await page.getByRole("heading", { name: "Forma", exact: true }).waitFor();
await page.evaluate(() => document.fonts.ready);
await page.screenshot({
  path: new URL("desktop.png", output).pathname.replace(/^\/(\w:)/, "$1"),
  fullPage: true,
});
const results = await new AxeBuilder({ page })
  .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
  .analyze();
await writeFile(
  new URL("../../artifacts/local/accessibility.json", import.meta.url),
  JSON.stringify(
    results.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.map((n) => ({
        target: n.target,
        summary: n.failureSummary,
      })),
    })),
    null,
    2,
  ),
);
await page.getByRole("tab", { name: "SEO opportunities", exact: true }).click();
await page.screenshot({
  path: new URL("seo.png", output).pathname.replace(/^\/(\w:)/, "$1"),
  fullPage: true,
});
await page.setViewportSize({ width: 390, height: 844 });
await page.getByRole("tab", { name: "Overview", exact: true }).click();
await page.screenshot({
  path: new URL("mobile.png", output).pathname.replace(/^\/(\w:)/, "$1"),
  fullPage: true,
});
console.log(
  JSON.stringify({
    accessibilityViolations: results.violations.length,
    errors,
    screenshots: ["desktop.png", "seo.png", "mobile.png"],
  }),
);
await browser.close();
