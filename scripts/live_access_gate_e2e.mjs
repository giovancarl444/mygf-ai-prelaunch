import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true, executablePath: "/usr/bin/chromium", args: ["--no-sandbox"] });
const context = await browser.newContext();
const page = await context.newPage();

try {
  await page.goto("http://127.0.0.1:3000/pilot", { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  const heading = await page.getByRole("heading", { name: /your private thread/i }).textContent();
  const signIn = await page.getByRole("button", { name: /sign in to continue/i }).count();
  const url = page.url();

  if (!heading || signIn !== 1 || !url.includes("/pilot")) {
    throw new Error(`Expected the branded private-account gate without redirect; received URL ${url}.`);
  }

  console.log("PASS: unauthenticated /pilot shows the branded private-account gate before OAuth.");
} finally {
  await context.close();
  await browser.close();
}
