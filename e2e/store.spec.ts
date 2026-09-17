import { expect, test } from "@playwright/test";

test.describe("Site public", () => {
  test("la page d'accueil se charge avec la marque au header", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByLabel("Parapharmacie Beauregard — accueil")).toBeVisible();
    await expect(page.locator("h1, h2, h3").first()).toBeVisible();
  });

  test("les assets éditoriaux premium répondent et se rendent réellement", async ({ page, request }) => {
    const assets = [
      "/images/premium/hero/hero-skincare-desktop.webp",
      "/images/premium/univers/face.webp",
      "/images/premium/univers/hair.webp",
      "/images/premium/univers/body.webp",
      "/images/premium/univers/baby.webp",
      "/images/premium/univers/wellness.webp",
      "/images/premium/univers/men.webp",
      "/images/premium/assistant/assistant-beaute-premium.webp",
      "/images/premium/about/about-para.webp",
      "/images/premium/campaigns/campaign-sun-care.webp",
      "/images/premium/campaigns/campaign-skin-routine.webp",
    ];

    for (const asset of assets) {
      const response = await request.get(asset);
      expect(response.status(), asset).toBe(200);
    }

    await page.goto("/", { waitUntil: "networkidle" });
    const loadedAssets = await page.evaluate(async (expectedAssets) => Promise.all((expectedAssets as string[]).map((src) => new Promise<{ src: string; naturalWidth: number; naturalHeight: number }>((resolve) => {
      const image = new Image();
      image.onload = () => resolve({ src, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight });
      image.onerror = () => resolve({ src, naturalWidth: 0, naturalHeight: 0 });
      image.src = src;
    }))), assets);
    expect(loadedAssets.every((image) => image.naturalWidth > 0 && image.naturalHeight > 0), JSON.stringify(loadedAssets)).toBe(true);

    await page.goto("/a-propos", { waitUntil: "networkidle" });
    const aboutImage = page.locator('img[src*="about-para"], img[src*="about%2Fabout-para"]');
    await expect(aboutImage).toHaveCount(1);
    await expect.poll(() => aboutImage.evaluate((image) => ({ width: (image as HTMLImageElement).naturalWidth, height: (image as HTMLImageElement).naturalHeight }))).toEqual({ width: expect.any(Number), height: expect.any(Number) });
    expect(await aboutImage.evaluate((image) => (image as HTMLImageElement).naturalWidth > 0 && (image as HTMLImageElement).naturalHeight > 0)).toBe(true);
  });

  test("les pages pratiques répondent en 200", async ({ page }) => {
    for (const path of ["/suivi-commande", "/retour", "/comparateur", "/marques", "/faq", "/livraison-retours", "/mentions-legales"]) {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
    }
  });

  test("le formulaire de suivi de commande est présent", async ({ page }) => {
    await page.goto("/suivi-commande");
    await expect(page.locator("#suivi-ref:visible")).toBeVisible();
    await expect(page.locator("#suivi-token:visible")).toBeVisible();
    await expect(page.getByRole("button", { name: "Afficher le suivi" })).toBeVisible();
  });

  test("le formulaire de demande de retour est présent", async ({ page }) => {
    await page.goto("/retour");
    await expect(page.locator("#retour-ref:visible")).toBeVisible();
    await expect(page.locator('select[name="reason"]:visible')).toBeVisible();
    await expect(page.locator("#retour-details:visible")).toBeVisible();
  });

  test("le comparateur affiche un état vide soigné", async ({ page }) => {
    await page.goto("/comparateur");
    await expect(page.getByRole("heading", { name: "Comparateur produits" })).toBeVisible();
    await expect(page.getByRole("main").getByText("Aucun produit à comparer pour le moment.", { exact: true })).toBeVisible();
  });

  test("la recherche publique est accessible", async ({ page }) => {
    const response = await page.goto("/recherche?q=creme");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: /Résultats pour/ })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByPlaceholder(/Rechercher un produit/)).toBeVisible();
  });

  test("le contact affiche les coordonnées officielles", async ({ page }) => {
    await page.goto("/contact");
    await expect(page.getByRole("main").getByText("06 63 48 82 87", { exact: true })).toBeVisible();
    await expect(page.getByRole("main").getByText("parabeauregard@gmail.com", { exact: true })).toBeVisible();
    await expect(page.getByRole("main").getByText("Casablanca, Maroc", { exact: true })).toBeVisible();
    await expect(page.getByRole("main").locator('a[href="tel:+212663488287"]')).toHaveCount(1);
    await expect(page.getByRole("main").locator('a[href*="33.6025816"]')).toHaveCount(1);
    await expect(page.locator("body")).not.toContainText("+212 5 22 00 00 00");
    await expect(page.locator("body")).not.toContainText("contact@parabeauregard.ma");
  });

  test("les cartes produit ont toujours un visuel réel ou un fallback premium", async ({ page }) => {
    await page.goto("/recherche?q=creme", { waitUntil: "domcontentloaded" });
    await expect(page.locator("article").first()).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(1500);
    const invalid = await page.locator("article").evaluateAll((cards) => cards.filter((card) => {
      const fallback = card.querySelector(".premium-product-fallback");
      const image = card.querySelector("img");
      return !fallback && (!image || (image as HTMLImageElement).naturalWidth === 0);
    }).length);
    expect(invalid).toBe(0);
  });

  test("la fiche Guinot rend la description normalisée", async ({ page }) => {
    await page.goto("/produits/guinot-longue-vie-creme-jeunesse-revitalisante-visage-homme-50-ml", { waitUntil: "domcontentloaded" });
    const summary = page.locator("main p.leading-relaxed").first();
    await expect(summary).toContainText("peau. Le soin");
    await expect(summary).not.toContainText("peau.Le");
    await expect(summary).toContainText("3 actions : il dynamise");
    await expect(summary).not.toContainText("3 actions, il :Dynamise");
    // Le bloc description peut être rendu deux fois (mobile + bureau) : on vérifie le premier.
    const description = page.locator("text=Description").locator("..").locator("div.prose-sm").first();
    await expect(description).toContainText("peau. Le soin");
    await expect(description).toContainText("3 actions : il dynamise");
  });

  test("une fiche sans réputation ne rend pas de section vide", async ({ page }) => {
    await page.goto("/produits/guinot-longue-vie-creme-jeunesse-revitalisante-visage-homme-50-ml", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("region", { name: "Ce qu'en dit le web" })).toHaveCount(0);
    await expect(page.getByText("Aucun avis pour le moment")).toHaveCount(0);
  });

  test("le chat assistant s'ouvre depuis la page d'accueil", async ({ page }) => {
    await page.goto("/");
    const fab = page.getByRole("button", { name: "Ouvrir l'assistant" });
    await expect(fab).toBeVisible();
    await fab.click({ force: true });
    await expect(page.getByRole("dialog", { name: "Assistant Para Beauregard" })).toBeVisible();
  });

  test("le Cart Drawer reste au-dessus du storefront et verrouille le document", async ({ page }) => {
    await page.goto("/produits/guinot-longue-vie-creme-jeunesse-revitalisante-visage-homme-50-ml");
    const add = page.getByRole("button", { name: "Ajouter au panier" }).first();
    await expect(add).toBeVisible({ timeout: 15_000 });
    await add.click();

    const drawer = page.locator('[data-cart-drawer][data-state="open"]');
    await expect(drawer).toBeVisible();
    await expect(drawer).toHaveAttribute("role", "dialog");
    await expect(drawer).toHaveAttribute("aria-modal", "true");
    await expect(page.locator("[data-cart-backdrop]")).toBeVisible();
    await expect(page.getByRole("button", { name: /Ouvrir l'assistant/ })).toHaveCount(0);

    const geometry = await page.evaluate(() => {
      const drawer = document.querySelector<HTMLElement>('[data-cart-drawer][data-state="open"]')!;
      const hero = document.querySelector<HTMLElement>("main")!;
      const viewport = { width: window.innerWidth, height: window.innerHeight };
      const drawerBox = drawer.getBoundingClientRect();
      const points = [
        { x: Math.max(1, drawerBox.left + drawerBox.width / 2), y: 8 },
        { x: Math.max(1, drawerBox.left + drawerBox.width / 2), y: viewport.height / 2 },
        { x: Math.max(1, drawerBox.left + drawerBox.width / 2), y: viewport.height - 8 },
      ];
      return {
        viewport,
        drawer: { top: drawerBox.top, bottom: drawerBox.bottom, left: drawerBox.left, right: drawerBox.right },
        hero: hero.getBoundingClientRect().toJSON(),
        bodyOverflow: document.body.style.overflow,
        scrollAreaOverflow: getComputedStyle(drawer.querySelector("ul") ?? drawer).overflowY,
        hitsDrawer: points.map((point) => {
          const hit = document.elementFromPoint(point.x, point.y);
          return Boolean(hit?.closest("[data-cart-drawer]"));
        }),
      };
    });

    expect(geometry.drawer.top).toBeLessThanOrEqual(1);
    expect(geometry.drawer.bottom).toBeGreaterThanOrEqual(geometry.viewport.height - 1);
    expect(geometry.drawer.right).toBeLessThanOrEqual(geometry.viewport.width + 1);
    expect(geometry.bodyOverflow).toBe("hidden");
    expect(geometry.scrollAreaOverflow).toBe("auto");
    expect(geometry.hitsDrawer).toEqual([true, true, true]);

    await page.keyboard.press("Escape");
    await expect(page.locator('[data-cart-drawer][data-state="closed"]')).toHaveAttribute("inert", "");
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("");
  });
});
