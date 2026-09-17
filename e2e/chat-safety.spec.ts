import { expect, test } from "@playwright/test";

// Mode déterministe : la CI n'a pas de clé IA, l'assistant utilise le repli local.
test.describe("Assistant — garde-fous santé et pertinence", () => {
  test("API : une demande médicale ne renvoie aucun produit", async ({ request }) => {
    for (const message of [
      "Quel antibiotique prendre pour une infection ?",
      "Quel médicament prendre pour une infection urinaire ?",
    ]) {
      const response = await request.post("/api/chat", { data: { message } });
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.products).toEqual([]);
      expect(body.reply).toMatch(/pharmacien/);
      expect(body.reply).toMatch(/médecin/);
    }
  });

  test("API : sans correspondance, aucune recommandation au hasard", async ({ request }) => {
    const response = await request.post("/api/chat", { data: { message: "zzqxw introuvable ailleurs" } });
    expect(response.status()).toBe(200);
    expect((await response.json()).products).toEqual([]);
  });

  test("UI : question médicale sans fiche produit, recherche soin toujours utile", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Ouvrir l'assistant" }).click();
    const panel = page.locator('div[role="dialog"][aria-label="Assistant Para Beauregard"]');
    await expect(panel).toBeVisible();
    const input = panel.getByRole("textbox", { name: "Votre message" });
    const send = panel.getByRole("button", { name: "Envoyer" });
    const productLinks = panel.locator('a[href^="/produits/"]');

    await input.fill("Quel antibiotique prendre pour une infection ?");
    await send.click();
    await expect(panel).toContainText("consultez un médecin", { timeout: 15_000 });
    await expect(productLinks).toHaveCount(0);

    await input.fill("Je cherche une crème Guinot");
    await send.click();
    await expect(productLinks.first()).toBeVisible({ timeout: 15_000 });
    await expect(productLinks.first()).toHaveAttribute("href", /guinot/);
  });
});
