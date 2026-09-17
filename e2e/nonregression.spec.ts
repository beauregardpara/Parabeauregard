import { expect, test } from "@playwright/test";

test.describe("Non-régression production (API & headers)", () => {
  test("/api/health est opérationnel et ne fuit pas de secrets", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.version).toBeTruthy();
    expect(body.service).toBe("para-beauregard-storefront");
    expect(typeof body.config).toBe("object");
    // Sans session admin : seul le nombre de produits publiés est exposé.
    expect(body.counts.products).toBeGreaterThan(0);
    expect(body.counts.orders).toBeUndefined();
    expect(body.counts.customers).toBeUndefined();
    expect(body.config.emailKind).toBeUndefined();
    const raw = JSON.stringify(body);
    expect(raw).not.toContain("password");
    expect(raw).not.toContain("superSecret");
    expect(raw).not.toContain("Bearer ");
  });

  test("headers de sécurité présents sur le storefront", async ({ request }) => {
    const res = await request.get("/");
    const csp = res.headers()["content-security-policy"] ?? "";
    expect(csp).toContain("img-src 'self' https: data: blob:");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(res.headers()["x-content-type-options"]).toBe("nosniff");
  });

  test("les pages pratiques ne sont jamais en intermédiaire de recherche", async ({ request }) => {
    const res = await request.get("/recherche?q=%3Cscript%3E");
    expect(res.status()).toBe(200);
    expect((await res.text()).slice(0, 200)).not.toContain("<script>");
  });
});
