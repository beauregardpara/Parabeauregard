import { expect, test, type Page } from "@playwright/test";
import { adminLogin } from "./fixtures/admin-login";

/**
 * Sélection groupée au-delà de la page affichée.
 *
 * Le lot « CIMassa » (30 brouillons dédiés) dépasse les 25 lignes d'une page :
 * c'est ce qui permet de vérifier qu'une action porte bien sur tout le filtre.
 */
const BRAND = "CIMassa";
const TOTAL = 30;
const PER_PAGE = 25;

const listUrl = (statut: string) =>
  // Le paramètre jetable évite de relire une page déjà en cache côté client.
  `/admin/produits?marque=${BRAND}&statut=${statut}&_=${Date.now()}-${Math.random().toString(36).slice(2)}`;

async function countRows(page: Page, statut: string) {
  await page.goto(listUrl(statut));
  await page.waitForLoadState("networkidle");
  return page.locator('input[name="ids"]').count();
}

/** L'action groupée est asynchrone : on attend que la liste reflète le changement. */
async function expectRows(page: Page, statut: string, expected: number) {
  await expect
    .poll(async () => countRows(page, statut), { timeout: 20_000, message: `lignes ${statut}` })
    .toBe(expected);
}

test.describe("Admin — sélection groupée sur tout le filtre", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const password = process.env.SEED_ADMIN_PASSWORD ?? "";
    test.skip(!password, "SEED_ADMIN_PASSWORD non défini");
    test.skip(testInfo.project.name !== "chromium", "exécuté sur le projet chromium uniquement");
    await adminLogin(page, testInfo, "admin@demo.invalid", password);
  });

  test("publie les 30 produits du filtre, pas seulement les 25 de la page", async ({ page }) => {
    await page.goto(listUrl("PENDING_REVIEW"));
    await page.waitForLoadState("networkidle");
    await expect(page.locator('input[name="ids"]')).toHaveCount(PER_PAGE);

    // Rien ne doit être proposé tant que la page n'est pas entièrement cochée.
    const banner = page.getByRole("status");
    await expect(banner).toHaveCount(0);

    await page.getByRole("checkbox", { name: "Sélectionner tous les produits de cette page" }).check();
    await expect(banner).toContainText(`Les ${PER_PAGE} produits de cette page`);

    await page.getByRole("button", { name: `Sélectionner les ${TOTAL} produits correspondant au filtre` }).click();
    await expect(banner).toContainText(`Les ${TOTAL} produits correspondant au filtre sont sélectionnés`);
    await expect(page.locator('input[name="scope"]')).toHaveValue("filtered");
    await expect(page.locator('input[name="expectedCount"]')).toHaveValue(String(TOTAL));

    await page.getByRole("button", { name: "Publier" }).click();
    await page.waitForLoadState("networkidle");

    await expectRows(page, "PUBLISHED", PER_PAGE); // 30 publiés : 25 sur la 1re page
    await expectRows(page, "PENDING_REVIEW", 0); // aucun brouillon restant

    // Remise en état pour que le lot reste utilisable et invisible côté boutique.
    await page.goto(listUrl("PUBLISHED"));
    await page.waitForLoadState("networkidle");
    await page.getByRole("checkbox", { name: "Sélectionner tous les produits de cette page" }).check();
    await page.getByRole("button", { name: `Sélectionner les ${TOTAL} produits correspondant au filtre` }).click();
    await page.getByRole("button", { name: "À valider" }).click();
    await page.waitForLoadState("networkidle");
    await expectRows(page, "PENDING_REVIEW", PER_PAGE);
  });

  test("décocher une ligne ramène la portée à la page affichée", async ({ page }) => {
    await page.goto(listUrl("PENDING_REVIEW"));
    await page.waitForLoadState("networkidle");
    await page.getByRole("checkbox", { name: "Sélectionner tous les produits de cette page" }).check();
    await page.getByRole("button", { name: `Sélectionner les ${TOTAL} produits correspondant au filtre` }).click();
    await expect(page.locator('input[name="scope"]')).toHaveValue("filtered");

    await page.locator('input[name="ids"]').first().uncheck();
    await expect(page.locator('input[name="scope"]')).toHaveValue("page");
    await expect(page.locator('input[name="expectedCount"]')).toHaveValue("");
    await expect(page.getByRole("status")).toHaveCount(0);
  });
});
