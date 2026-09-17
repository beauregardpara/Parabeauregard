import { expect, test } from "@playwright/test";

test.describe("Lancement — honnêteté et sécurité", () => {
  test("les mentions légales signalent les informations en attente sans les inventer", async ({ page }) => {
    await page.goto("/mentions-legales");
    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { name: "Informations légales" })).toBeVisible();
    await expect(main.locator("[data-legal-field]")).toHaveCount(7);
    await expect(main.locator('[data-legal-field="rc"]')).toContainText("En attente");
    await expect(main).not.toContainText("XXXXXX");
  });

  test("aucun horaire ni délai de remboursement non validé n'est annoncé", async ({ page }) => {
    await page.goto("/contact");
    await expect(page.getByRole("main")).not.toContainText("9h–19h");
    await page.goto("/livraison-retours");
    await expect(page.getByRole("main")).not.toContainText("5 jours ouvrés");
    await page.goto("/cgv");
    await expect(page.getByRole("main")).not.toContainText("5 jours");
  });

  test("la page de connexion admin n'affiche aucun identifiant", async ({ page }) => {
    await page.goto("/admin/login");
    await expect(page.locator("body")).not.toContainText("admin123");
    await expect(page.locator("body")).not.toContainText("Compte de démonstration");
  });

  test("le super-admin annule la commande de démonstration sans toucher au reste", async ({ page }, testInfo) => {
    const password = process.env.SEED_ADMIN_PASSWORD ?? "";
    test.skip(!password, "SEED_ADMIN_PASSWORD non défini");
    // Action à effet de bord unique : exécutée une seule fois (projet desktop).
    test.skip(testInfo.project.name !== "chromium", "exécuté sur le projet chromium uniquement");
    await page.goto("/admin/login");
    await page.locator('input[name="email"]:visible').fill("admin@demo.invalid");
    await page.locator('input[name="password"]:visible').fill(password);
    await page.getByRole("button", { name: "Se connecter" }).click();
    await page.waitForURL((url) => url.pathname.startsWith("/admin") && !url.pathname.startsWith("/admin/login"), { timeout: 20_000 });

    await page.goto("/admin/commandes?q=482910");
    await page.locator("tbody tr").first().getByRole("link").first().click();
    await expect(page).toHaveURL(/\/admin\/commandes\/\d+$/, { timeout: 15_000 });
    // La fiche commande doit s'afficher entièrement (régression : bouton d'impression côté serveur).
    await expect(page.getByRole("heading", { name: "Statut de la commande" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Imprimer bon de livraison/ })).toBeVisible();
    await page.getByRole("button", { name: "Annuler la commande de démonstration" }).click();
    await expect(page.getByRole("button", { name: "Annuler la commande de démonstration" })).toHaveCount(0, { timeout: 15_000 });
  });
});
