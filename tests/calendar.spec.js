import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const door = (page, day) => page.getByRole("button", { name: new RegExp(`^${day}(?: Heute)?$`) });
const rubSurface = (page) => page.getByRole("button", { name: "Rubbelfläche" });

async function gotoDay(page, day) {
  await page.clock.setFixedTime(new Date(Date.UTC(2026, 11, day, 12)));
  await page.goto("./");
}

async function rubWithKeyboard(page) {
  await rubSurface(page).focus();
  for (let step = 0; step < 4 && await rubSurface(page).isVisible(); step++) {
    await page.keyboard.press("Enter");
  }
}

test("loads from a GitHub Pages-style subpath with its local assets", async ({ page, request }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.clock.setFixedTime(new Date("2026-11-26T12:00:00Z"));
  await page.goto("./");
  await expect(page.getByRole("listitem")).toHaveCount(24);
  await expect(door(page, 1)).toBeDisabled();
  await expect(page.getByText("Das erste Türchen öffnet am 1. Dezember um 8 Uhr.")).toBeVisible();
  for (const file of ["styles.css", "calendar-data.js", "assets/tannenzweig.webp", "assets/fonts/instrument-serif.woff2"]) {
    expect((await request.get(file)).ok()).toBe(true);
  }
  expect(errors).toEqual([]);
});

test("keeps future days locked and saves a door opened by real mouse movement", async ({ page }) => {
  await gotoDay(page, 6);
  await expect(door(page, 6)).toHaveAttribute("aria-current", "date");
  await expect(page.getByText(/Vorschau/)).toHaveCount(0);
  await expect(door(page, 7)).toBeDisabled();
  await expect(door(page, 5)).toBeEnabled();
  await door(page, 6).click();

  const scratch = page.locator("canvas");
  const box = await scratch.boundingBox();
  const x = (fraction) => box.x + box.width * fraction;
  const y = (fraction) => box.y + box.height * fraction;
  await page.mouse.move(x(0.06), y(0.14));
  await page.mouse.down();
  await page.mouse.move(x(0.94), y(0.14), { steps: 12 });
  await expect(scratch).toBeVisible();
  for (const row of [0.34, 0.54, 0.74, 0.9]) {
    await page.mouse.move(x(0.94), y(row));
    await page.mouse.move(x(0.06), y(row), { steps: 12 });
    if (!(await scratch.isVisible())) break;
  }
  await page.mouse.up();
  await expect(page.getByText("6. Dezember 2026", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(door(page, 6)).toBeFocused();

  await page.reload();
  await door(page, 6).click();
  await expect(page.getByText("6. Dezember 2026", { exact: true })).toBeVisible();
});

test("rubs the surface in steps by keyboard and returns focus", async ({ page }) => {
  await gotoDay(page, 1);
  await door(page, 1).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Rubble Türchen 1 frei" })).toBeVisible();
  await expect(rubSurface(page)).toBeFocused();
  await expect(page.getByRole("button", { name: "Ohne Rubbeln öffnen" })).toHaveCount(0);
  await page.keyboard.press("Space");
  await expect(rubSurface(page)).toBeVisible();
  await rubWithKeyboard(page);
  await expect(page.locator("#letter-title")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(door(page, 1)).toBeFocused();
});

test("uses a real Berlin date independent of the visitor's browser timezone", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-11-30T23:02:00Z"));
  await page.goto("./");
  await expect(door(page, 1)).toHaveAttribute("aria-current", "date");
  await expect(door(page, 1)).toBeDisabled();
  await expect(door(page, 2)).toBeDisabled();
});

test("renders optional photos and falls back when an image fails", async ({ page }) => {
  await page.route("**/calendar-data.js", async (route) => {
    await route.fulfill({
      contentType: "text/javascript",
      body: `export const doors = Array.from({ length: 24 }, (_, index) => ({
          day: index + 1, title: "", text: "", image: "", alt: "",
        }));
        Object.assign(doors[0], { title: "Ein Foto", text: "Erster Absatz.\\n\\nZweiter Absatz.",
          image: "assets/tannenzweig.webp", alt: "Ein Tannenzweig" });
        Object.assign(doors[1], { image: "assets/fotos/fehlt.webp", alt: "Fehlend" });`,
    });
  });
  await gotoDay(page, 2);
  await door(page, 1).click();
  await rubWithKeyboard(page);
  await expect(page.getByRole("heading", { name: "Ein Foto" })).toBeVisible();
  await expect(page.getByText("Zweiter Absatz.")).toBeVisible();
  await expect(page.getByRole("img", { name: "Ein Tannenzweig" })).toBeVisible();
  await page.keyboard.press("Escape");
  await door(page, 2).click();
  await rubWithKeyboard(page);
  await expect(page.locator(".letter__placeholder")).toBeVisible();
  await expect(page.getByRole("img", { name: "Fehlend" })).toHaveCount(0);
});

test("has no automated accessibility violations in the calendar and both dialog states", async ({ page }) => {
  await gotoDay(page, 1);
  const audit = async () => {
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(result.violations).toEqual([]);
  };
  await audit();
  await door(page, 1).click();
  await audit();
  await rubWithKeyboard(page);
  await audit();
});

test.describe("touch and mobile layout", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });

  test("opens after a touch drag and fits three columns without sideways scrolling", async ({ page, context }) => {
    await gotoDay(page, 12);
    const columns = await page.getByRole("list").evaluate((grid) => getComputedStyle(grid).gridTemplateColumns);
    expect(columns.split(" ")).toHaveLength(3);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
    await door(page, 12).tap();
    const scratch = page.locator("canvas");
    const box = await scratch.boundingBox();
    const client = await context.newCDPSession(page);
    const point = (x, y) => [{ x: box.x + box.width * x, y: box.y + box.height * y }];
    await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: point(0.05, 0.16) });
    for (const row of [0.16, 0.35, 0.54, 0.73, 0.9]) {
      await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: point(0.05, row) });
      await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: point(0.95, row) });
      if (!(await scratch.isVisible())) break;
    }
    await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect(page.getByText("12. Dezember 2026", { exact: true })).toBeVisible();
  });
});

test("switches today's highlight when Berlin reaches midnight with the page open", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-12-06T22:59:55Z") });
  await page.goto("./");
  await expect(door(page, 6)).toHaveAttribute("aria-current", "date");
  await expect(door(page, 7)).toBeDisabled();
  await page.clock.fastForward(16000);
  await expect(door(page, 7)).toHaveAttribute("aria-current", "date");
  await expect(door(page, 7)).toBeDisabled();
  await expect(door(page, 6)).toBeEnabled();
});

test("unlocks the highlighted door at 08:00 Berlin time with the page open", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-12-07T06:59:55Z") });
  await page.goto("./");
  await expect(door(page, 7)).toHaveAttribute("aria-current", "date");
  await expect(door(page, 7)).toBeDisabled();
  await page.clock.fastForward(6000);
  await expect(door(page, 7)).toBeEnabled();
  await expect(door(page, 8)).toBeDisabled();
});

test("the local test link unlocks every door and stores openings separately", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-11-26T12:00:00Z"));
  await page.goto("?test=6");
  await expect(page.getByRole("list").locator("button:enabled")).toHaveCount(24);
  await expect(door(page, 6)).toHaveAttribute("aria-current", "date");
  await expect(page.getByText(/Vorschau|Testmodus/)).toHaveCount(0);
  await door(page, 24).click();
  await rubWithKeyboard(page);
  await expect(page.getByText("24. Dezember 2026", { exact: true })).toBeVisible();

  await page.clock.setFixedTime(new Date("2026-12-24T07:00:00Z"));
  await page.goto("./");
  await door(page, 24).click();
  await expect(rubSurface(page)).toBeVisible();
});

test("fits the entire rub surface into a shallow landscape dialog", async ({ page }) => {
  await page.setViewportSize({ width: 740, height: 320 });
  await gotoDay(page, 6);
  await door(page, 6).click();
  const bounds = await rubSurface(page).boundingBox();
  const dialogBounds = await page.getByRole("dialog").boundingBox();
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(dialogBounds.y + dialogBounds.height);
});
