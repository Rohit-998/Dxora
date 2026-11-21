import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const sample = JSON.parse(
  readFileSync(
    new URL("../../examples/sample-response.json", import.meta.url),
    "utf8",
  ),
);

test.beforeEach(async ({ page }) => {
  await page.route("**/health", (route) =>
    route.fulfill({
      json: {
        status: "ok",
        configured: true,
        authentication_required: false,
        model: "gemini-3.5-flash-lite",
      },
    }),
  );
});

test("sample report covers every section and filters queries", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "A clearer view." }),
  ).toBeVisible();
  await expect(page.getByText("Sample report", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Competitors", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Clay", exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Search queries", exact: true }).click();
  await expect(page.locator(".query-card")).toHaveCount(5);
  await page.getByRole("button", { name: "Instagram", exact: true }).click();
  await expect(page.locator(".query-card")).toHaveCount(1);
  await page
    .getByRole("tab", { name: "SEO opportunities", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "What the HTML tells us" }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Services", exact: true }).click();
  await expect(page.locator(".service-card")).toHaveCount(5);
  await page.getByText("View source evidence").first().click();
  await expect(page.locator("blockquote").first()).toBeVisible();
  await page.getByRole("tab", { name: "Audience", exact: true }).click();
  await expect(page.locator(".persona")).toHaveCount(3);
  await page.getByRole("tab", { name: "Sources", exact: true }).click();
  await page.getByText("Read extracted content").click();
  await expect(page.locator(".source-text")).toContainText(
    "fictional independent digital studio",
  );
});

test("submits real endpoint contract, stores history, and exports JSON", async ({
  page,
}) => {
  await page.route("**/link-analysis", async (route) => {
    expect(route.request().postDataJSON()).toEqual({
      url: "https://example.com",
    });
    await route.fulfill({
      json: {
        ...sample,
        brand: { ...sample.brand, name: "Live Test" },
        metadata: {
          ...sample.metadata,
          is_demo: false,
          request_id: "test-live",
        },
      },
    });
  });
  await page.goto("/");
  await page.getByLabel("Website URL").fill("example.com");
  await page
    .getByRole("button", { name: "Analyze website", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Live Test", exact: true }),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export report" }).click();
  expect((await download).suggestedFilename()).toBe("aperture-live-test.json");
  await page.getByRole("button", { name: /Recent reports/ }).click();
  await expect(page.locator(".history-card")).toHaveCount(1);
  await page.reload();
  await page.getByRole("button", { name: /Recent reports/ }).click();
  await expect(page.locator(".history-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Clear session history" }).click();
  await expect(
    page.getByRole("heading", { name: "Your next discovery starts here." }),
  ).toBeVisible();
});

test("API failure is actionable and never replaced with fake success", async ({
  page,
}) => {
  await page.route("**/link-analysis", (route) =>
    route.fulfill({
      status: 503,
      json: {
        success: false,
        error: {
          code: "not_configured",
          message:
            "Add GEMINI_API_KEY to the server .env to run live analysis.",
        },
      },
    }),
  );
  await page.goto("/");
  await page.getByLabel("Website URL").fill("https://example.com");
  await page
    .getByRole("button", { name: "Analyze website", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("GEMINI_API_KEY");
  await expect(page.getByText("Sample report", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Analysis complete", { exact: true }),
  ).toHaveCount(0);
});

test("mobile navigation, layout, and keyboard tab switching", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  );
  expect(overflow).toBe(false);
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("button", { name: "How it works", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Good insights show their working." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("button", { name: "Website analysis", exact: true })
    .click();
  await page.getByRole("tab", { name: "Overview", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("tab", { name: "Competitors", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
});

test("settings dialog is keyboard dismissible and never persists access keys", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Connection settings" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByLabel("Analysis access key").fill("session-only-key");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  expect(
    await page.evaluate(() =>
      JSON.stringify({ ...sessionStorage, ...localStorage }),
    ),
  ).not.toContain("session-only-key");
});
