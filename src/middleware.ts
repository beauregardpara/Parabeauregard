import { NextResponse, type NextRequest } from "next/server";

/**
 * Protection des surfaces d'administration.
 *
 * Le `redirect()` du layout `/admin/(dashboard)` ne suffit pas : Next.js rend
 * le layout ET la page en parallèle, si bien que la charge utile RSC de la page
 * (chiffre d'affaires, références de commande, noms de clients) était produite
 * puis envoyée avant que la redirection ne prenne effet. Le middleware, lui,
 * s'exécute AVANT tout rendu : aucune donnée n'est générée sans session valide.
 *
 * La vérification reprend exactement le format de jeton de `src/lib/auth.ts`
 * (`base64url(payload).base64url(HMAC-SHA256)`), avec l'API Web Crypto afin de
 * rester compatible avec le runtime edge du middleware.
 */

const ADMIN_COOKIE = "pb_admin";

function base64urlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Comparaison à temps constant, pour ne rien révéler sur la signature attendue. */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function hasValidAdminSession(token: string | undefined, secret: string): Promise<boolean> {
  if (!token) return false;
  const [body, signature] = token.split(".");
  if (!body || !signature) return false;

  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const expected = new Uint8Array(
      await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body))
    );
    if (!timingSafeEqual(expected, base64urlToBytes(signature))) return false;

    const payload = JSON.parse(new TextDecoder().decode(base64urlToBytes(body))) as {
      sub?: number;
      exp?: number;
    };
    return typeof payload.exp === "number" && payload.exp > Date.now() && typeof payload.sub === "number";
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);
  const secret = process.env.SESSION_SECRET;

  // Sans secret configuré, aucune session ne peut être authentifiée : on
  // verrouille plutôt que d'ouvrir l'administration.
  const valid = secret
    ? await hasValidAdminSession(request.cookies.get(ADMIN_COOKIE)?.value, secret)
    : false;

  if (pathname.startsWith("/api/admin/")) {
    if (!valid) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // Pages d'administration : la page de connexion reste évidemment ouverte.
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    if (!valid) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
