import { createHash } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { isIP } from "net";
import * as cheerio from "cheerio";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export class HttpError extends Error {
  constructor(public status: number, url: string) {
    super(`HTTP ${status} — ${url}`);
  }
}

/**
 * Anti-SSRF : refuse les hôtes internes (loopback, RFC1918, APIPA, IPV6
 * privée/liaison locale) qui peuvent cacher un service interne ou le
 * metadata endpoint cloud. Appliqué aux images scrappées, qui viennent
 * historiquement de données de produit (potentiellement_admin_contrôlées).
 */
export function isBlockedHost(hostname: string): boolean {
  if (!hostname) return true;
  const host = hostname.toLowerCase();
  if (host === "localhost" || /\.localhost$/.test(host)) return true;
  if (/\.local$/.test(host) || /\.internal$/.test(host) || host.endsWith(".localdomain")) return true;

  const version = isIP(host);
  if (version === 4) {
    const parts = host.split(".").map(Number);
    const [a, b] = parts;
    if (a === 10 || a === 127 || a === 0) return true; // RFC1918 / critique
    if (a === 169 && b === 254) return true; // APIPA / metadata cloud
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16/12
    if (a === 192 && b === 168) return true; // 192.168/16
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64/10
    return false;
  }
  if (version === 6) {
    const v6 = host.toLowerCase();
    if (v6 === "::" || v6 === "::1" || v6.startsWith("::ffff:127")) return true;
    if (v6.startsWith("fe80") || v6.startsWith("fec0")) return true; // link-local
    if (v6.startsWith("fd") || v6.startsWith("fc")) return true; // ULA
    return false;
  }
  return !/^[a-z0-9-]+(\.[a-z0-9-]+)*$/i.test(host) || host.length > 253;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const randomDelay = ([min, max]: [number, number]) => Math.floor(min + Math.random() * (max - min));

type RobotsRule = { userAgents: string[]; disallow: string[] };

function robotsRuleMatchesPath(rule: string, path: string): boolean {
  if (!rule) return false;
  if (rule === "/") return true;
  if (rule.endsWith("$")) return rule.slice(0, -1) === path;
  const idx = rule.indexOf("*");
  if (idx !== -1) {
    const prefix = rule.slice(0, idx);
    const suffix = rule.slice(idx + 1);
    if (suffix) return path.startsWith(prefix) && path.endsWith(suffix);
    return path.startsWith(prefix);
  }
  return path.startsWith(rule);
}

export type RobotsInfo = {
  allowed: boolean;
  note: string;
  isAllowed: (url: string) => boolean;
  rules: RobotsRule[];
};

export async function isAllowedByRobots(baseUrl: string): Promise<RobotsInfo> {
  const rules: RobotsRule[] = [];
  const fallback: RobotsInfo = {
    allowed: true,
    note: "robots.txt injoignable → autorisé par défaut",
    isAllowed: () => true,
    rules,
  };
  try {
    const res = await fetch(new URL("/robots.txt", baseUrl).toString(), {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      return { ...fallback, note: "robots.txt absent ou inaccessible → autorisé par défaut" };
    }
    const text = await res.text();

    let current: RobotsRule | null = null;
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      if (/^user-agent:/i.test(line)) {
        const ua = line.slice(line.indexOf(":") + 1).trim().toLowerCase();
        if (!current || ua === "*") {
          current = { userAgents: [ua], disallow: [] };
          rules.push(current);
        } else {
          current.userAgents.push(ua);
        }
      } else if (/^disallow:/i.test(line) && current) {
        const v = line.slice(line.indexOf(":") + 1).trim();
        if (v) current.disallow.push(v);
      }
    }

    const relevant = rules.filter(
      (r) => r.userAgents.includes("*") || r.userAgents.includes("bot") || r.userAgents.includes("spider")
    ).flatMap((r) => r.disallow).filter(Boolean);

    const isAllowed = (url: string): boolean => {
      try {
        const path = new URL(url).pathname;
        return !relevant.some((rule) => robotsRuleMatchesPath(rule, path));
      } catch {
        return true;
      }
    };

    return {
      allowed: relevant.length === 0,
      note:
        relevant.length === 0
          ? "robots.txt : aucun blocage"
          : `robots.txt restreint (${relevant.length} règles Disallow)`,
      isAllowed,
      rules,
    };
  } catch {
    return fallback;
  }
}

const RETRYABLE_HTTP = [429, 500, 502, 503, 504, 520, 521, 522, 523, 524];

/** Fait moins de retries si l'erreur n'est pas retryable (4xx). */
function isRetryable(err: unknown): boolean {
  if (err instanceof HttpError) return RETRYABLE_HTTP.includes(err.status);
  const code = (err as { cause?: { code?: string } }).cause?.code;
  return code === "ETIMEDOUT" || code === "ECONNRESET" || code === "ECONNREFUSED" || code === "UND_ERR_CONNECT_TIMEOUT" || code === "UND_ERR_HEADERS_TIMEOUT" || code === "UND_ERR_BODY_TIMEOUT";
}

async function fetchHtml(url: string, retries = 3): Promise<string> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "fr-FR,fr;q=0.9,ar;q=0.8",
        },
        signal: AbortSignal.timeout(15000),
        redirect: "follow",
      });
      if (!res.ok) throw new HttpError(res.status, url);
      return await res.text();
    } catch (err) {
      lastErr = err;
      if (attempt === retries) break;
      // Backoff exponentiel + jitter ; les erreurs non-retryables ne réessayent pas
      if (err instanceof HttpError && !isRetryable(err)) break;
      const base = 1200 * 2 ** attempt;
      await sleep(base + Math.floor(Math.random() * base * 0.4));
    }
  }
  throw lastErr instanceof HttpError ? lastErr : new Error((lastErr as Error)?.message ?? "fetch_html_error");
}

export async function politeFetch(url: string, delayMs: [number, number]): Promise<cheerio.CheerioAPI> {
  await sleep(randomDelay(delayMs));
  const html = await fetchHtml(url);
  return cheerio.load(html);
}

function isImageBuffer(buffer: Buffer): boolean {
  if (buffer.length < 100) return false;
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return true;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return true;
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) return true;
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer.length > 11 && buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) return true;
  return false;
}

function resolveUrl(remoteUrl: string, baseUrl?: string): string | null {
  try {
    if (remoteUrl.startsWith("http://") || remoteUrl.startsWith("https://")) {
      return new URL(remoteUrl).toString();
    }
    if (baseUrl) return new URL(remoteUrl, baseUrl).toString();
    return null;
  } catch {
    return null;
  }
}

function extFromUrl(url: string): string | null {
  try {
    const pathname = new URL(url).pathname;
    const m = pathname.match(/\.(jpe?g|png|webp|gif|avif|svg)(?:\?|$)/i);
    return m ? m[1].toLowerCase() : null;
  } catch {
    return null;
  }
}

export async function downloadImage(remoteUrl: string, baseUrl?: string): Promise<string | null> {
  const absolute = resolveUrl(remoteUrl, baseUrl);
  if (!absolute) return null;

  // Garde anti-SSRF : hôte local/privé refusé (métadonnées cloud, loopback…)
  try {
    if (isBlockedHost(new URL(absolute).hostname)) return null;
  } catch {
    return null;
  }

  const headers: Record<string, string> = {
    "User-Agent": USER_AGENT,
    Accept: "image/avif,image/webp,image/*,*/*;q=0.8",
  };
  try {
    headers.Referer = new URL(baseUrl ?? absolute).origin;
  } catch {}

  for (let attempt = 0; attempt <= 1; attempt++) {
    try {
      const res = await fetch(absolute, {
        headers,
        signal: AbortSignal.timeout(15000),
        redirect: "follow",
      });
      if (!res.ok) {
        await sleep(1200);
        continue;
      }

      const buffer = Buffer.from(await res.arrayBuffer());
      if (!isImageBuffer(buffer) || buffer.length < 100) {
        await sleep(1200);
        continue;
      }

      const contentType = res.headers.get("content-type") ?? "";
      let ext = extFromUrl(absolute) ?? "jpg";
      if (!extFromUrl(absolute)) {
        if (contentType.includes("png")) ext = "png";
        else if (contentType.includes("webp")) ext = "webp";
        else if (contentType.includes("gif")) ext = "gif";
        else if (contentType.includes("avif")) ext = "avif";
        else if (contentType.includes("jpeg") || contentType.includes("jpg")) ext = "jpg";
      }

      const hash = createHash("md5").update(absolute).digest("hex").slice(0, 16);
      const dir = path.join(process.cwd(), "public", "uploads", "scraped");
      await mkdir(dir, { recursive: true });
      const filename = `${hash}.${ext}`;
      await writeFile(path.join(dir, filename), buffer);
      return `/uploads/scraped/${filename}`;
    } catch {
      if (attempt === 1) return null;
      await sleep(1200);
    }
  }
  return null;
}

/**
 * Recherche des images produit via DuckDuckGo / Bing / Google Images.
 */
export async function searchProductImages(query: string): Promise<string[]> {
  const images: string[] = [];
  const cleanedQuery = query
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N}\s&]+/gu, " ")
    .trim()
    .slice(0, 120);
  if (!cleanedQuery) return images;

  const push = (url: string) => {
    const httpUrl = url.startsWith("//") ? `https:${url}` : url;
    if (!/^https?:\/\//i.test(httpUrl)) return;
    if (/\.(svg|ico|gif|avif)/i.test(httpUrl)) return;
    if (/(duckduckgo\.com|googleusercontent\.com\/.*logo|icons\.|logo\.)/i.test(httpUrl)) return;
    if (httpUrl.length > 400) return;
    try {
      if (isBlockedHost(new URL(httpUrl).hostname)) return;
    } catch {
      return;
    }
    if (!images.includes(httpUrl)) images.push(httpUrl);
  };

  // Méthode 1: DuckDuckGo HTML search
  try {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(cleanedQuery + " photo produit")}`;
    const res = await fetch(searchUrl, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html", "Accept-Language": "fr-FR,fr;q=0.9" },
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) {
      const html = await res.text();
      const $ = cheerio.load(html);
      $("img").each((_, el) => {
        const src = $(el).attr("src") || $(el).attr("data-src") || "";
        if (src) push(src);
      });
      $("a.result__a").each((_, el) => {
        const href = $(el).attr("href") || "";
        const uddg = href.match(/uddg=([^&]+)/);
        if (uddg) push(decodeURIComponent(uddg[1]));
      });
    }
  } catch {}

  // Méthode 2: Bing Images
  if (images.length === 0) {
    try {
      const searchUrl = `https://www.bing.com/images/search?q=${encodeURIComponent(cleanedQuery)}&qft=+filterui:photo-photo`;
      const res = await fetch(searchUrl, {
        headers: { "User-Agent": USER_AGENT, Accept: "text/html", "Accept-Language": "fr-FR,fr;q=0.9" },
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) {
        const html = await res.text();
        const matches = html.match(/https?:\/\/[^"'\s<>]+\.(jpg|jpeg|png|webp)(\?[^"'\s<>]*)?/gi) ?? [];
        for (const url of matches) {
          const decoded = url.replace(/&amp;/g, "&");
          // Extrait l'URL du média réel si présente (murl=)
          const murl = html.match(/murl&quot;:&quot;([^&]+)/);
          if (murl) push(decodeURIComponent(murl[1]));
          push(decoded);
          if (images.length >= 3) break;
        }
      }
    } catch {}
  }

  // Méthode 3: Google Images (scraping simple)
  if (images.length === 0) {
    try {
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(cleanedQuery)}&tbm=isch&hl=fr`;
      const res = await fetch(searchUrl, {
        headers: { "User-Agent": USER_AGENT, Accept: "text/html", "Accept-Language": "fr-FR,fr;q=0.9" },
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) {
        const html = await res.text();
        const matches = html.match(/https?:\/\/[^"'\s<>]+\.(jpg|jpeg|png|webp)(\?[^"'\s<>]*)?/gi) ?? [];
        for (const url of matches) {
          push(url.replace(/&amp;/g, "&"));
          if (images.length >= 3) break;
        }
      }
    } catch {}
  }

  return images.slice(0, 3);
}

/**
 * Recherche Google Images (fallback secondaire).
 */
export async function searchGoogleImages(query: string): Promise<string[]> {
  return searchProductImages(query + " photo");
}
