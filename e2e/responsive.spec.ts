import { expect, test } from "@playwright/test";

/**
 * Aucune page ne doit déborder horizontalement : un débordement force un
 * défilement latéral et casse la lecture sur mobile.
 */
const PAGES = [
  "/",
  "/categories/soins-visage",
  "/recherche?q=creme",
  "/promotions",
  "/nouveautes",
  "/marques",
  "/panier",
  "/commander",
  "/comparateur",
  "/compte/connexion",
  "/contact",
  "/faq",
];

const WIDTHS = [375, 430, 768, 1024, 1440];

test.describe("Responsive", () => {
  for (const width of WIDTHS) {
    test(`aucun débordement horizontal à ${width} px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      // On neutralise les animations (marquee, apparitions) : elles déplacent
      // les éléments et rendraient la mesure de mise en page instable.
      await page.emulateMedia({ reducedMotion: "reduce" });
      for (const path of PAGES) {
        // La mesure doit se faire une fois les feuilles de style appliquées et
        // les images dimensionnées.
        await page.goto(path, { waitUntil: "domcontentloaded" });
        await page.locator("body").waitFor({ state: "visible" });
        const overflow = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }));
        // 1 px de tolérance pour les arrondis de sous-pixel.
        expect(
          overflow.scrollWidth,
          `${path} déborde à ${width} px (${overflow.scrollWidth} > ${overflow.clientWidth})`
        ).toBeLessThanOrEqual(overflow.clientWidth + 1);
      }
    });
  }
});
