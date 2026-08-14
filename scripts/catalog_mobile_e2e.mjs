import { chromium } from "playwright";

const baseUrl = "http://localhost:3000";
const browser = await chromium.launch({ headless: true, executablePath: "/usr/bin/chromium" });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

try {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.locator("#worlds").scrollIntoViewIfNeeded();

  const cards = page.locator(".companion-card");
  if (await cards.count() !== 18) throw new Error("Mobile catalog should render all 18 worlds.");
  if (await page.locator(".zero-overlay-portrait-frame .companion-dossier").count() !== 0) throw new Error("Dossier content must not render inside any portrait frame.");

  const first = await cards.nth(0).boundingBox();
  const second = await cards.nth(1).boundingBox();
  if (!first || !second || Math.abs(first.x - second.x) > 1 || second.y <= first.y) throw new Error("Mobile catalog cards should stack in one column.");

  await page.screenshot({ path: "/home/ubuntu/mygf_analysis/catalog_mobile_e2e.png", fullPage: false });
  console.log("Mobile catalog checks passed: responsive stacking and zero-overlay structure.");
} finally {
  await browser.close();
}
