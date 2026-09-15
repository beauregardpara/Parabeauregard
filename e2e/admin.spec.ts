import { expect, test } from "@playwright/test";

test.describe("Administration", () => {
  test("la page de connexion est accessible", async ({ page }) => {
    await page.goto("/admin/login");
    await expect(page.locator('input[name="email"]:visible')).toBeVisible();
    await expect(page.locator('input[name="password"]:visible')).toBeVisible();
    await expect(page.getByRole("button", { name: "Se connecter" })).toBeVisible();
    await expect(page.locator('img[src*="para-beauregard-official"]')).toBeVisible();
  });

  test("le login admin n'embarque aucun shell storefront", async ({ page }) => {
    await page.goto("/admin/login");
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator("header")).toHaveCount(0);
    await expect(page.locator('input[placeholder="Rechercher..."]')).toHaveCount(0);
    await expect(page.getByRole("button", { name: /panier/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /assistant beauté/i })).toHaveCount(0);
    await expect(page.locator(".bottom-nav")).toHaveCount(0);
    await expect(page.getByText("Espace sécurisé")).toBeVisible();
  });

  test("les pages internes exigent une connexion", async ({ page }) => {
    for (const path of ["/admin", "/admin/journal", "/admin/system", "/admin/quality"]) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await expect(page.locator('input[name="email"]:visible')).toBeVisible();
    }
  });

  /**
   * Régression sécurité : le `redirect()` du layout admin laissait Next rendre
   * la page en parallèle, si bien que la charge utile RSC (CA, références de
   * commande, noms de clients) partait sur le réseau avant la redirection.
   * Le middleware doit désormais couper avant tout rendu.
   */
  test("aucune donnée d'administration n'est transmise sans session", async ({ request }) => {
    for (const path of ["/admin", "/admin/commandes", "/admin/clients"]) {
      const response = await request.get(path, { maxRedirects: 0 });
      expect(response.status(), `${path} doit rediriger`).toBe(307);
      expect(response.headers()["location"]).toContain("/admin/login");
      const body = await response.text();
      for (const leak of ["CA total", "Panier moyen", "PB-20", "Tableau de bord"]) {
        expect(body, `${path} ne doit pas contenir « ${leak} »`).not.toContain(leak);
      }
    }
  });

  test("l'API d'administration refuse un cookie forgé", async ({ request }) => {
    const response = await request.post("/api/admin/scrape", {
      headers: { cookie: "pb_admin=eyJzdWIiOjEsImV4cCI6OTk5OTk5OTk5OTk5OX0.signature-bidon" },
      data: {},
      maxRedirects: 0,
    });
    expect(response.status()).toBe(401);
  });

  test("rejette des identifiants erronés", async ({ page }) => {
    await page.goto("/admin/login");
    await page.locator('input[name="email"]:visible').fill("wrong@example.com");
    await page.locator('input[name="password"]:visible').fill("nawak");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page.getByText("Identifiants incorrects ou compte désactivé.")).toBeVisible({ timeout: 15_000 });
  });
});
