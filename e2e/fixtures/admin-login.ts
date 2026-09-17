import type { Page, TestInfo } from "@playwright/test";

/**
 * Connexion admin pour les tests E2E.
 *
 * La limite de connexions (5 / 5 min par adresse) reste active. En CI, le serveur
 * fait confiance à l'en-tête X-Forwarded-For (TRUSTED_PROXY=true) : chaque test,
 * et chaque nouvelle tentative, reçoit sa propre adresse de documentation
 * (198.51.100.0/24), ce qui évite qu'un test épuise la limite d'un autre.
 */
export async function adminLogin(page: Page, testInfo: TestInfo, email: string, password: string) {
  let hash = 0;
  for (const ch of testInfo.titlePath.join("/")) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const octet = ((hash + testInfo.retry * 37) % 250) + 1;
  await page.setExtraHTTPHeaders({ "x-forwarded-for": `198.51.100.${octet}` });

  await page.goto("/admin/login");
  await page.locator('input[name="email"]:visible').fill(email);
  await page.locator('input[name="password"]:visible').fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL((url) => url.pathname.startsWith("/admin") && !url.pathname.startsWith("/admin/login"), {
    timeout: 20_000,
  });
}
