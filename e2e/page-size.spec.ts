import { expect, test } from "@playwright/test";

/**
 * Choix du nombre de produits par page, côté boutique.
 *
 * Le catalogue de test compte plus de 800 produits publiés : « Tout » doit donc
 * en afficher nettement plus qu'une page standard, et une valeur fantaisiste
 * dans l'URL ne doit pas permettre de réclamer une page démesurée.
 */
const cartes = "a[href^='/produits/']";

test.describe("Boutique — produits par page", () => {
  test("le sélecteur change réellement le nombre de produits affichés", async ({ page }) => {
    await page.goto("/recherche?q=soin&parPage=12");
    await page.waitForLoadState("networkidle");
    const douze = await page.locator(cartes).count();
    expect(douze).toBeGreaterThan(0);
    expect(douze).toBeLessThanOrEqual(12 * 2); // marge : une carte peut porter plusieurs liens

    await page.getByRole("link", { name: "48", exact: true }).click();
    await page.waitForLoadState("networkidle");
    expect(new URL(page.url()).searchParams.get("parPage")).toBe("48");
    const quaranteHuit = await page.locator(cartes).count();
    expect(quaranteHuit).toBeGreaterThan(douze);
  });

  test("« Tout » affiche l'ensemble du catalogue filtré", async ({ page }) => {
    await page.goto("/recherche?q=soin&parPage=tout");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("link", { name: /^Tout \(\d+\)$/ })).toHaveAttribute("aria-current", "true");
    // Plus d'une page standard, et aucune pagination puisque tout tient sur une page.
    expect(await page.locator(cartes).count()).toBeGreaterThan(96);
    await expect(page.getByRole("navigation", { name: "Pagination" })).toHaveCount(0);
  });

  test("une valeur fantaisiste retombe sur la valeur par défaut", async ({ page }) => {
    await page.goto("/recherche?q=soin&parPage=99999");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("link", { name: "12", exact: true })).toHaveAttribute("aria-current", "true");
  });
});
