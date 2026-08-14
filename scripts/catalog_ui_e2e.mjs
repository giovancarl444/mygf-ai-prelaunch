import { chromium } from "playwright";

const baseUrl = "http://localhost:3000";
const browser = await chromium.launch({ headless: true, executablePath: "/usr/bin/chromium" });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

const assertEqual = (actual, expected, label) => {
  if (actual !== expected) throw new Error(`${label}: expected ${expected}, received ${actual}`);
};

try {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.locator("#worlds").scrollIntoViewIfNeeded();

  const countCards = () => page.locator(".companion-card").count();
  assertEqual(await countCards(), 6, "Initial catalog count");

  await page.locator("#world-type").selectOption("Reflective");
  assertEqual(await countCards(), 2, "Reflective category count");

  await page.locator("#age-range").selectOption("25–29");
  assertEqual(await countCards(), 1, "Reflective 25–29 age count");

  await page.locator("#energy-filter").selectOption("Grounded");
  assertEqual(await countCards(), 1, "Grounded energy count");

  await page.getByLabel("Search companion worlds").fill("marisol");
  assertEqual(await countCards(), 1, "Search result count");

  await page.getByLabel("Search companion worlds").fill("no-match-world");
  assertEqual(await countCards(), 0, "No-result count");
  await page.getByRole("button", { name: "Clear all filters" }).click();
  assertEqual(await countCards(), 6, "Reset catalog count");

  await page.screenshot({ path: "/home/ubuntu/mygf_analysis/catalog_ui_e2e.png", fullPage: false });
  console.log("Catalog UI end-to-end checks passed: search, category, age, energy, no-result, and reset.");
} finally {
  await browser.close();
}
