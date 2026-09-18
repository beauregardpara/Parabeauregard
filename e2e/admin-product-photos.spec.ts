import { expect, test, type Page } from "@playwright/test";
import { adminLogin } from "./fixtures/admin-login";

// PNG 1×1 valide : suffisant pour l'aperçu local, jamais envoyé au stockage.
const PNG_1PX = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

/**
 * Un fichier choisi avant l'hydratation de React est ignoré (aucun gestionnaire
 * encore attaché) : on attend que le formulaire soit interactif.
 */
async function openCreationForm(page: Page) {
  await page.goto("/admin/produits/nouveau");
  await page.waitForLoadState("networkidle");
}

test.describe("Admin — photos à la création d'un produit", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const password = process.env.SEED_ADMIN_PASSWORD ?? "";
    test.skip(!password, "SEED_ADMIN_PASSWORD non défini");
    await adminLogin(page, testInfo, "admin@demo.invalid", password);
  });

  test("le formulaire de création propose l'ajout de photos, ordonnables et retirables", async ({ page }) => {
    // Sélection seulement, sans soumettre : ce test ne doit jamais écrire dans
    // un stockage d'images, quel que soit l'environnement où il tourne.
    await openCreationForm(page);
    await expect(page.getByRole("heading", { name: "Photos du produit" })).toBeVisible();

    await page.getByLabel("Choisir des photos du produit").setInputFiles([
      { name: "face.png", mimeType: "image/png", buffer: PNG_1PX },
      { name: "dos.png", mimeType: "image/png", buffer: PNG_1PX },
    ]);
    const photos = page.getByRole("list", { name: "Photos sélectionnées" }).getByRole("listitem");
    await expect(photos).toHaveCount(2);
    await expect(photos.first()).toContainText("Principale");
    await expect(page.getByText("2/12")).toBeVisible();

    await page.getByRole("button", { name: "Déplacer la photo 2 vers la gauche" }).click();
    await expect(photos.first()).toContainText("Principale");
    await page.getByRole("button", { name: "Retirer la photo 1" }).click();
    await expect(photos).toHaveCount(1);
  });

  test("un fichier qui n'est pas une image est refusé avec un message clair", async ({ page }) => {
    await openCreationForm(page);
    await page.getByLabel("Choisir des photos du produit").setInputFiles({
      name: "notice.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4"),
    });
    // Filtré : Next.js ajoute son propre `role="alert"` (annonceur de route).
    await expect(page.getByRole("alert").filter({ hasText: "JPEG, PNG ou WEBP" })).toBeVisible();
    await expect(page.getByRole("list", { name: "Photos sélectionnées" })).toHaveCount(0);
  });

  test("créer un produit sans photo ouvre bien sa fiche", async ({ page }) => {
    await page.goto("/admin/produits/nouveau");
    const name = `Produit E2E sans photo ${Date.now()}`;
    await page.locator('input[name="name"]').fill(name);
    await page.locator('input[name="brand"]').fill("Marque E2E");
    await page.locator('select[name="categoryId"]').selectOption({ index: 1 });
    await page.locator('input[name="price"]').fill("99");
    await page.locator('input[name="stock"]').fill("3");
    await page.getByRole("button", { name: "Enregistrer le produit" }).click();

    await page.waitForURL(/\/admin\/produits\/\d+$/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { name })).toBeVisible();
    await expect(page.getByRole("heading", { name: /^Images \(0\)/ })).toBeVisible();
  });
});
