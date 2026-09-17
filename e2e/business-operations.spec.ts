import { expect, test } from "@playwright/test";
import { adminLogin } from "./fixtures/admin-login";

// Comptes synthétiques créés par prisma/seed.ts dans la base jetable de CI ; les
// mots de passe viennent des variables SEED_*_PASSWORD définies par le workflow.
const SEED_SUPER_ADMIN = { email: "admin@demo.invalid", password: process.env.SEED_ADMIN_PASSWORD ?? "" };
const SEED_CATALOG_MANAGER = { email: "catalogue@demo.invalid", password: process.env.SEED_CATALOG_PASSWORD ?? "" };

test.describe("Exploitation quotidienne", () => {
  test("le formulaire de contact accepte un message sans sujet", async ({ page }) => {
    await page.goto("/contact");
    const form = page.locator("form").filter({ has: page.getByRole("button", { name: "Envoyer le message" }) });
    await form.getByLabel("Nom").fill("Cliente CI");
    await form.getByLabel("Email").fill("cliente.ci@example.com");
    await form.getByLabel("Téléphone").fill("06 00 00 00 00");
    await form.getByLabel("Message").fill("Bonjour, ce produit est-il disponible en pharmacie ?");
    await form.getByRole("button", { name: "Envoyer le message" }).click();
    await expect(form.getByRole("status")).toContainText("votre message a bien été envoyé", { timeout: 15_000 });
  });

  test("« Mot de passe oublié » mène à une demande qui ne révèle pas les comptes", async ({ page }) => {
    await page.goto("/compte/connexion");
    await page.getByRole("link", { name: "Mot de passe oublié ?" }).click();
    await expect(page).toHaveURL(/\/mot-de-passe\/oublie$/);
    const main = page.getByRole("main");
    await main.getByLabel("Email").fill("personne@example.com");
    await main.getByRole("button", { name: "Envoyer le lien" }).click();
    await expect(main.getByRole("status")).toContainText("Si un compte existe", { timeout: 15_000 });
  });

  test("un lien de réinitialisation invalide est refusé", async ({ page }) => {
    await page.goto("/mot-de-passe/reinitialiser?token=invalide");
    const main = page.getByRole("main");
    await main.getByLabel("Nouveau mot de passe").fill("nouveau-secret");
    await main.getByLabel("Confirmer le mot de passe").fill("nouveau-secret");
    await main.getByRole("button", { name: "Enregistrer" }).click();
    await expect(main.getByRole("alert")).toContainText("n'est plus valide", { timeout: 15_000 });
  });

  test("l'assistant répond aux questions pratiques sans vendre de produit", async ({ request }) => {
    const response = await request.post("/api/chat", { data: { message: "Quels sont les frais de livraison ?" } });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.products).toEqual([]);
    expect(body.reply).toMatch(/livr/i);
    expect(body.reply).toMatch(/DH/);
  });

  test("le super-admin retrouve une commande par sa référence", async ({ page }, testInfo) => {
    test.skip(!SEED_SUPER_ADMIN.password, "SEED_ADMIN_PASSWORD non défini");
    await adminLogin(page, testInfo, SEED_SUPER_ADMIN.email, SEED_SUPER_ADMIN.password);
    await expect(page.getByText("Commandes aujourd'hui")).toBeVisible();
    await page.goto("/admin/commandes");
    const search = page.getByLabel("Rechercher une commande");
    await expect(search).toBeVisible();
    await search.fill("PB-");
    await page.getByRole("button", { name: "Rechercher" }).click();
    await expect(page).toHaveURL(/q=PB-/);
    await expect(page.locator("tbody tr").first()).toContainText("PB-");
  });

  test("un gestionnaire catalogue n'accède pas aux clients", async ({ page }, testInfo) => {
    test.skip(!SEED_CATALOG_MANAGER.password, "SEED_CATALOG_PASSWORD non défini");
    await adminLogin(page, testInfo, SEED_CATALOG_MANAGER.email, SEED_CATALOG_MANAGER.password);
    await page.goto("/admin/clients");
    await expect(page).toHaveURL(/\/admin\/produits/);
    await expect(page.locator("body")).not.toContainText("Points fidélité");
    await expect(page.getByRole("link", { name: "Clients" })).toHaveCount(0);
  });
});
