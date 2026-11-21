import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const section of [
  "Overview",
  "Competitors",
  "Search queries",
  "SEO opportunities",
  "Services",
  "Audience",
  "Sources",
]) {
  test(`${section} has no automated WCAG A/AA violations`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.route("**/health", (route) =>
      route.fulfill({
        json: {
          status: "ok",
          configured: false,
          authentication_required: false,
          model: "gemini-3.5-flash-lite",
        },
      }),
    );
    await page.goto("/");
    await page.getByRole("tab", { name: section, exact: true }).click();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      results.violations.map((item) => ({
        id: item.id,
        nodes: item.nodes.map((node) => ({
          target: node.target,
          failure: node.failureSummary,
        })),
      })),
    ).toEqual([]);
  });
}
