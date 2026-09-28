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

/**
 * Panier de test, pose avant le chargement de la page.
 *
 * Indispensable : visitees avec un panier vide, `/panier` et `/commander` ne
 * rendent qu'un message, et leur mise en page reelle n'etait jamais mesuree.
 * C'est ainsi qu'un debordement de 143 px sur la page de commande est passe
 * inapercu — le nom de produit tronque, donc insecable, y poussait la grille
 * a 502 px sur un ecran de 375.
 */
const PANIER = [
  {
    productId: 1,
    slug: "produit-au-nom-volontairement-tres-long-pour-le-test",
    name: "Un produit dont le nom est volontairement très long pour éprouver la mise en page",
    imageUrl: null,
    price: 324,
    qty: 2,
    maxStock: -1,
  },
];

test.describe("Responsive", () => {
  for (const width of WIDTHS) {
    test(`aucun débordement horizontal à ${width} px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript((panier) => {
        try { localStorage.setItem("pb_cart_v1", JSON.stringify(panier)); } catch {}
      }, PANIER);
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

/**
 * La barre de recherche existe en deux exemplaires : posée dans l'en-tête à
 * partir de 1024 px, en pleine largeur sous l'en-tête en dessous. Les deux
 * seuils ne se rejoignaient pas et la tranche 768–1023 px n'affichait aucun
 * champ de recherche.
 */
test.describe("Barre de recherche", () => {
  for (const width of [375, 768, 900, 1024, 1440]) {
    test(`un champ de recherche est utilisable à ${width} px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/", { waitUntil: "domcontentloaded" });

      const champs = page.getByRole("combobox", { name: "Rechercher un produit" });
      const visible = champs.filter({ visible: true });
      await expect(visible).toHaveCount(1);

      await visible.fill("creme");
      await page.getByRole("button", { name: "Lancer la recherche" }).filter({ visible: true }).click();
      await expect(page).toHaveURL(/\/recherche\?q=creme/);
      await expect(page.getByRole("heading", { name: /Résultats pour/ })).toBeVisible({ timeout: 15_000 });
    });
  }

  test("les suggestions se parcourent au clavier", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const champ = page.getByRole("combobox", { name: "Rechercher un produit" }).filter({ visible: true });
    await champ.fill("creme");
    const options = page.getByRole("option");
    await expect(options.first()).toBeVisible({ timeout: 15_000 });

    await champ.press("ArrowDown");
    await expect(options.first()).toHaveAttribute("aria-selected", "true");

    await champ.press("Escape");
    await expect(options.first()).toBeHidden();
  });
});
