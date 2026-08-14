import { chromium } from "playwright";

const baseUrl = "http://localhost:3000";
const qaEmail = "qa-catalog-refactor@mygf.invalid";
const browser = await chromium.launch({ headless: true, executablePath: "/usr/bin/chromium" });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

async function submitInterest() {
  await page.locator("#beta-interest").scrollIntoViewIfNeeded();
  await page.getByLabel("Email address").fill(qaEmail);
  await page.getByLabel(/What draws you here/).selectOption("imaginative roleplay");
  await page.getByRole("button", { name: "Request beta access" }).last().click();
}

try {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await submitInterest();
  await page.getByRole("status").waitFor();
  const firstMessage = await page.getByRole("status").textContent();
  if (firstMessage?.trim() !== "Thank you — your private beta interest has been received.") throw new Error(`Unexpected first-time beta response: ${firstMessage}`);

  await page.reload({ waitUntil: "networkidle" });
  await submitInterest();
  await page.getByRole("status").waitFor();
  const duplicateMessage = await page.getByRole("status").textContent();
  if (duplicateMessage?.trim() !== "You are already on the private beta interest list.") throw new Error(`Unexpected duplicate beta response: ${duplicateMessage}`);

  console.log("Beta-interest end-to-end checks passed: first-time and duplicate responses.");
} finally {
  await browser.close();
}
