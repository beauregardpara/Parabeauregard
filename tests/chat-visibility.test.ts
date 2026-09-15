import { describe, expect, it } from "vitest";
import { isAssistantHiddenRoute } from "@/lib/chat/visibility";

describe("assistant visibility", () => {
  it.each(["/", "/recherche", "/panier", "/commander", "/produits/test", "/admin", "/admin/commandes"]) (
    "reste visible sur %s",
    (pathname) => expect(isAssistantHiddenRoute(pathname)).toBe(false),
  );

  it.each(["/compte/connexion", "/compte/inscription", "/admin/login", "/login", "/reset-password"]) (
    "est masqué sur %s",
    (pathname) => expect(isAssistantHiddenRoute(pathname)).toBe(true),
  );
});
