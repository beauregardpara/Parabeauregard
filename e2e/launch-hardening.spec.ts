import { expect, test } from "@playwright/test";
import { adminLogin } from "./fixtures/admin-login";

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

  test("une URL produit inexistante n'est pas indexable, une fiche réelle l'est", async ({ page }) => {
    // Le layout racine étant dynamique, Next.js ne peut plus corriger le statut
    // 200 déjà émis sur ces routes : le `noindex` est ce qui empêche
    // l'indexation d'un nombre illimité d'URL inexistantes.
    await page.goto("/produits/slug-qui-nexiste-pas-123");
    await expect(page.getByRole("heading", { name: "Page introuvable" })).toBeVisible();

    // On vérifie le HTML réellement servi : c'est ce que lit un robot
    // d'indexation, indépendamment de l'hydratation côté client.
    const missing = await page.request.get("/produits/slug-qui-nexiste-pas-123");
    expect(missing.status()).toBeLessThan(500);
    expect(await missing.text()).toMatch(/<meta name="robots"[^>]*noindex/);

    // Une fiche réellement publiée doit rester indexable et canonique.
    const slug = "guinot-longue-vie-creme-jeunesse-revitalisante-visage-homme-50-ml";
    const real = await page.request.get(`/produits/${slug}`);
    expect(real.status()).toBe(200);
    // Document entier : Next.js peut diffuser les métadonnées après l'ouverture
    // du <head>, un découpage sur </head> serait instable. Le payload RSC
    // échappe ses balises (\"meta\"), il ne peut donc pas fausser ces motifs.
    const realHtml = await real.text();
    expect(realHtml).not.toMatch(/<meta name="robots"[^>]*noindex/);
    expect(realHtml).toMatch(/<link rel="canonical"/);
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
    await adminLogin(page, testInfo, "admin@demo.invalid", password);

    await page.goto("/admin/commandes?q=482910");
    const orderLink = page.locator("tbody tr").first().getByRole("link").first();
    await expect(orderLink).toContainText("482910");
    const href = await orderLink.getAttribute("href");
    expect(href).toMatch(/^\/admin\/commandes\/\d+$/);
    await page.goto(href!);
    // La fiche commande doit s'afficher entièrement (régression : bouton d'impression côté serveur).
    await expect(page.getByRole("heading", { name: "Statut de la commande" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Imprimer bon de livraison/ })).toBeVisible();
    // L'annulation est un effet de bord unique : lors d'une nouvelle tentative
    // Playwright, la commande est déjà annulée et le bouton a légitimement
    // disparu — rejouer le clic échouerait alors sur un test pourtant vert.
    // On vérifie donc l'état final réellement attendu (le statut persisté),
    // ce qui est plus strict que la seule disparition du bouton.
    const cancelButton = page.getByRole("button", { name: "Annuler la commande de démonstration" });
    if ((await cancelButton.count()) > 0) await cancelButton.click();
    // On interroge l'état réellement enregistré plutôt que le rafraîchissement
    // automatique de la page, qui peut tarder sous charge.
    await expect
      .poll(
        async () => {
          await page.reload();
          return page.locator('select[name="status"]').inputValue();
        },
        { timeout: 20_000, message: "statut de la commande" }
      )
      .toBe("CANCELLED");
    await expect(page.getByRole("button", { name: "Annuler la commande de démonstration" })).toHaveCount(0);
  });
});
