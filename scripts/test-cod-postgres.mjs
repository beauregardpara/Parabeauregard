import { chromium } from "@playwright/test";

const productSlug = "guinot-creme-visage-depil-logic-anti-repousse-apaisante-15-ml";
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ baseURL: "http://localhost:3000" });
const page = await context.newPage();

try {
  await page.goto(`/produits/${productSlug}`, { waitUntil: "networkidle" });
  const add = page.getByRole("button", { name: "Ajouter au panier" }).first();
  await add.waitFor({ state: "visible", timeout: 15_000 });
  await add.click();
  await page.goto("/commander", { waitUntil: "networkidle" });
  await page.locator('input[name="fullName"]').fill("Test migration PostgreSQL");
  await page.locator('input[name="phone"]').fill("0663488287");
  await page.locator('input[name="email"]').fill("cod-migration-test@example.invalid");
  await page.locator('input[name="street"]').fill("Adresse de test PostgreSQL");
  await page.locator('input[name="city"]').fill("Casablanca");
  await page.locator('input[name="postalCode"]').fill("20000");
  await page.getByRole("button", { name: /Confirmer la commande/ }).click();
  await page.waitForURL(/\/commande\//, { timeout: 30_000 });
  const reference = new URL(page.url()).pathname.split("/").filter(Boolean).pop();
  console.log(JSON.stringify({ orderCreated: true, reference }, null, 2));
} catch (error) {
  console.log(JSON.stringify({ orderCreated: false, error: error instanceof Error ? error.message : "COD flow failed" }));
  process.exitCode = 1;
} finally {
  await browser.close();
}
