import { expect, test } from "@playwright/test";

// Fixture created by e2e/fixtures/seed-ci.ts with status HIDDEN.
const HIDDEN_SLUG = "ci-hidden-fixture-product";
const HIDDEN_NAME = "CI Hidden Fixture Zephyrine";
const PUBLISHED_SLUG = "guinot-longue-vie-creme-jeunesse-revitalisante-visage-homme-50-ml";

test.describe("Confidentialité des produits non publiés", () => {
  test("la fiche d'un produit masqué ne divulgue ni contenu ni métadonnées", async ({ page }) => {
    const response = await page.goto(`/produits/${HIDDEN_SLUG}`, { waitUntil: "networkidle" });
    expect([200, 404]).toContain(response?.status());
    await expect(page).not.toHaveTitle(/Zephyrine/);
    await expect(page.locator("body")).not.toContainText(HIDDEN_NAME);
    const leaks = await page.evaluate((name) => {
      const metas = [...document.querySelectorAll("meta")].map((m) => m.getAttribute("content") ?? "");
      const jsonLd = [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => s.textContent ?? "");
      return [...metas, ...jsonLd].filter((value) => value.includes(name));
    }, "Zephyrine");
    expect(leaks).toEqual([]);
    // Next.js may emit the noindex tag more than once while streaming; each one must say noindex.
    const robots = page.locator('meta[name="robots"]');
    await expect(robots.first()).toHaveAttribute("content", /noindex/);
    for (const content of await robots.evaluateAll((els) => els.map((el) => el.getAttribute("content") ?? ""))) {
      expect(content).toContain("noindex");
    }
  });

  test("le HTML brut d'un produit masqué ne contient pas son nom", async ({ request }) => {
    const response = await request.get(`/produits/${HIDDEN_SLUG}`);
    expect([200, 404]).toContain(response.status());
    expect(await response.text()).not.toContain("Zephyrine");
  });

  // The root loading.tsx boundary streams the shell before the page resolves, so
  // Next.js answers notFound() with its not-found UI plus <meta name="robots"
  // content="noindex"> (soft 404) rather than an HTTP 404 status. What must hold for
  // every crawler, JS-rendering or not: no product data and a non-indexable page.
  for (const [bot, userAgent] of [
    ["Googlebot", "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"],
    ["Bingbot", "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)"],
    ["facebookexternalhit", "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)"],
    ["Twitterbot", "Twitterbot/1.0"],
  ] as const) {
    test(`${bot} ne reçoit ni le nom ni une page indexable`, async ({ request }) => {
      const response = await request.get(`/produits/${HIDDEN_SLUG}`, { headers: { "user-agent": userAgent } });
      expect([200, 404]).toContain(response.status());
      const html = await response.text();
      expect(html).not.toContain("Zephyrine");
      expect(html).not.toContain("Fiche archivée de test CI");
      expect(html).toMatch(/<meta name="robots" content="noindex"/);
    });
  }

  test("le produit masqué est absent du sitemap et de la recherche", async ({ page, request }) => {
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).not.toContain(HIDDEN_SLUG);
    expect(sitemap).toContain(PUBLISHED_SLUG);
    await page.goto("/recherche?q=Zephyrine", { waitUntil: "domcontentloaded" });
    await expect(page.locator(`a[href="/produits/${HIDDEN_SLUG}"]`)).toHaveCount(0);
  });

  test("un produit publié garde son titre et répond 200", async ({ page }) => {
    const response = await page.goto(`/produits/${PUBLISHED_SLUG}`);
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(/Guinot/);
  });
});
