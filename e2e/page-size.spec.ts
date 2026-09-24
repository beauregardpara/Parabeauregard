import { expect, test } from "@playwright/test";

/**
 * Choix du nombre de produits par page, côté boutique.
 *
 * Les effectifs sont lus dans la page (libellé « Tout (N) ») plutôt que codés en
 * dur : le catalogue de démonstration est bien plus petit que celui en ligne, et
 * un test qui suppose 800 produits échouerait sans qu'aucune régression existe.
 */
const cartes = "a[href^='/produits/']";

/** Nombre de fiches distinctes : une carte peut porter plusieurs liens vers le même produit. */
async function fiches(page: import("@playwright/test").Page) {
  const hrefs = await page.locator(cartes).evaluateAll((els) =>
    els.map((el) => (el as HTMLAnchorElement).getAttribute("href") ?? "")
  );
  return new Set(hrefs).size;
}

/** Effectif total annoncé par l'option « Tout (N) ». */
async function totalAnnonce(page: import("@playwright/test").Page) {
  const libelle = await page.getByRole("link", { name: /^Tout \(\d+\)$/ }).innerText();
  return Number(libelle.replace(/\D+/g, ""));
}

test.describe("Boutique — produits par page", () => {
  test("le sélecteur change réellement le nombre de produits affichés", async ({ page }) => {
    await page.goto("/recherche?parPage=12");
    await page.waitForLoadState("networkidle");

    const total = await totalAnnonce(page);
    test.skip(total <= 12, `catalogue de test trop petit (${total} produits)`);

    const douze = await fiches(page);
    expect(douze).toBe(Math.min(12, total));

    await page.getByRole("link", { name: "48", exact: true }).click();
    await page.waitForLoadState("networkidle");
    expect(new URL(page.url()).searchParams.get("parPage")).toBe("48");
    expect(await fiches(page)).toBe(Math.min(48, total));
    expect(await fiches(page)).toBeGreaterThan(douze);
  });

  test("« Tout » affiche l'ensemble du catalogue filtré", async ({ page }) => {
    await page.goto("/recherche?parPage=tout");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("link", { name: /^Tout \(\d+\)$/ })).toHaveAttribute("aria-current", "true");
    // Tout tient sur une seule page : la pagination n'a plus lieu d'être.
    expect(await fiches(page)).toBe(await totalAnnonce(page));
    await expect(page.getByRole("navigation", { name: "Pagination" })).toHaveCount(0);
  });

  test("une valeur fantaisiste retombe sur la valeur par défaut", async ({ page }) => {
    await page.goto("/recherche?q=soin&parPage=99999");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("link", { name: "12", exact: true })).toHaveAttribute("aria-current", "true");
  });
});
