import { expect, test } from "@playwright/test";

test.describe("Mobile (iPhone 12)", () => {
  test("accueil : bottom-nav visible et panier ouvert depuis l'onglet", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Ouvrir l'assistant" })).toBeVisible();
    const nav = page.locator("nav[aria-label='Navigation mobile']");
    await expect(nav).toBeVisible();
    await nav.getByRole("button", { name: "Ouvrir le panier" }).click({ force: true });
    const aside = page.locator('aside[role="dialog"][aria-label="Panier"]');
    await expect(aside).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(aside).toHaveAttribute("inert", "");
  });

  test("menu mobile : ouverture puis fermeture par Escape", async ({ page }) => {
    await page.goto("/");
    const menu = page.locator('button[aria-label="Menu"]:visible');
    await expect(menu).toBeVisible();
    await menu.click();
    await expect(page.getByRole("navigation", { name: "Menu mobile" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("navigation", { name: "Menu mobile" })).toHaveCount(0);
  });

  test("fiche produit : sticky CTA pilotée par visibilité du CTA normal", async ({ page }) => {
    // `dispo=1` garantit un produit en stock : hors stock, la barre affiche
    // « Indisponible » et le test deviendrait dépendant de l'ordre du catalogue.
    await page.goto("/recherche?q=creme&dispo=1");
    const first = page.locator("a[href^='/produits/']").first();
    // On suit le lien par son href : cliquer pendant l'animation d'apparition
    // des cartes rend le test instable sans rien apprendre de plus.
    const href = await first.getAttribute("href");
    expect(href).toBeTruthy();
    await page.goto(href!);
    const normal = page.locator("#product-add-to-cart-normal").first();
    const sticky = page.locator("[data-product-sticky-cta]").last();
    await expect(normal).toBeVisible();
    await normal.scrollIntoViewIfNeeded();
    await expect(sticky).toHaveAttribute("data-active", "false");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(sticky).toHaveAttribute("data-active", "true");
    const boxes = await page.evaluate(() => {
      const a = document.querySelector("[data-product-sticky-cta][data-active='true']")!.getBoundingClientRect();
      const b = document.querySelector("nav[aria-label='Navigation mobile']")!.getBoundingClientRect();
      return { separated: a.bottom <= b.top + 1 };
    });
    expect(boxes.separated).toBe(true);
    await normal.scrollIntoViewIfNeeded();
    await expect(sticky).toHaveAttribute("data-active", "false");
  });

  test("search et panier : assistant global visible et accessible", async ({ page }) => {
    for (const path of ["/recherche?q=creme", "/panier"]) {
      await page.goto(path);
      await expect(page.getByRole("button", { name: "Ouvrir l'assistant" })).toBeVisible();
    }
  });

  test("produit : assistant visible et CTA sticky sans collision", async ({ page }) => {
    await page.goto("/recherche?q=creme&dispo=1");
    const href = await page.locator("a[href^='/produits/']").first().getAttribute("href");
    await page.goto(href!);
    await expect(page.getByRole("button", { name: "Ouvrir l'assistant" })).toBeVisible();
  });

  test("connexion client : assistant masqué", async ({ page }) => {
    await page.goto("/compte/connexion");
    await expect(page.getByRole("button", { name: "Ouvrir l'assistant" })).toHaveCount(0);
  });

  test("filtres : drawer accessible au clavier et fermé par Escape", async ({ page }) => {
    await page.goto("/recherche");
    const filterButton = page.locator('button[aria-controls="filter-drawer"]:visible').last();
    await filterButton.scrollIntoViewIfNeeded();
    await filterButton.click({ force: true });
    const drawer = page.locator('aside[role="dialog"][aria-label="Filtres"]');
    await expect(drawer).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(drawer).toHaveAttribute("inert", "");
  });

  test("assistant : le bouton flottant est présent et l'expose dialogue", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Ouvrir l'assistant" }).click({ force: true });
    await expect(page.locator('div[role="dialog"][aria-label="Assistant Para Beauregard"]')).toBeVisible();
  });

  test("Cart Drawer mobile couvre le viewport sans laisser passer le storefront", async ({ page }) => {
    await page.goto("/produits/guinot-longue-vie-creme-jeunesse-revitalisante-visage-homme-50-ml");
    const add = page.getByRole("button", { name: "Ajouter au panier" }).first();
    await expect(add).toBeVisible({ timeout: 15_000 });
    await add.click();

    const drawer = page.locator('[data-cart-drawer][data-state="open"]');
    await expect(drawer).toBeVisible();
    const geometry = await page.evaluate(() => {
      const drawer = document.querySelector<HTMLElement>('[data-cart-drawer][data-state="open"]')!;
      const box = drawer.getBoundingClientRect();
      const hit = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
      return {
        viewport: { width: window.innerWidth, height: window.innerHeight },
        drawer: { top: box.top, bottom: box.bottom, width: box.width },
        bodyOverflow: document.body.style.overflow,
        hitDrawer: Boolean(hit?.closest("[data-cart-drawer]")),
      };
    });

    expect(geometry.drawer.top).toBeLessThanOrEqual(1);
    expect(geometry.drawer.bottom).toBeGreaterThanOrEqual(geometry.viewport.height - 1);
    expect(geometry.drawer.width).toBe(geometry.viewport.width);
    expect(geometry.bodyOverflow).toBe("hidden");
    expect(geometry.hitDrawer).toBe(true);
    await expect(page.getByRole("button", { name: /Ouvrir l'assistant/ })).toHaveCount(0);
  });
});
