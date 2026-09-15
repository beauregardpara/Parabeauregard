import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const WCAG_A = ["wcag2a", "wcag21a"];

test.describe("Accessibilité (axe-core)", () => {
  test("accueil : aucune violation niveau A", async ({ page }) => {
    await page.goto("/");
    const results = await new AxeBuilder({ page }).withTags(WCAG_A).analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });

  test("recherche : aucune violation niveau A", async ({ page }) => {
    await page.goto("/recherche?q=creme");
    const results = await new AxeBuilder({ page }).withTags(WCAG_A).analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });

  test("fiche produit : aucune violation niveau A", async ({ page }) => {
    await page.goto("/recherche?q=creme");
    const first = page.locator("a[href^='/produits/']").first();
    const href = await first.getAttribute("href");
    expect(href).toBeTruthy();
    await page.goto(href!);
    await expect(page.locator("title")).not.toBeEmpty();
    const results = await new AxeBuilder({ page }).withTags(WCAG_A).analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });

  test("connexion admin : aucune violation niveau A", async ({ page }) => {
    await page.goto("/admin/login");
    const results = await new AxeBuilder({ page }).withTags(WCAG_A).analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });

  test("interaction clavier : Escape ferme le panier (dialogue inert)", async ({ page }) => {
    await page.goto("/");
    await page.locator("header").getByRole("button", { name: "Ouvrir le panier" }).click();
    const aside = page.locator('aside[role="dialog"][aria-label="Panier"]');
    await expect(aside).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(aside).toHaveAttribute("inert", "");
  });

  test("interaction clavier : Escape ferme le chat assistant", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Ouvrir l'assistant" }).click();
    const panel = page.locator('div[role="dialog"][aria-label="Assistant Para Beauregard"]');
    await expect(panel).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(panel).toHaveAttribute("inert", "");
  });
});
