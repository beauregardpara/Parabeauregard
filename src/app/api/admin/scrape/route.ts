import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { runScrape } from "@/lib/scraper/engine";
import { connectorKeys } from "@/lib/scraper/connectors";
import { db } from "@/lib/db";
import { getAdminSession, hasPermission } from "@/lib/auth";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/security/rate-limit";

const ScrapeRequestSchema = z.object({
  source: z.string().optional(),
});

/** Déclenche manuellement un scraping (réservé aux admins avec permission scraper:write). */
export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (!hasPermission(session.role as Parameters<typeof hasPermission>[0], "scraper:write"))
    return NextResponse.json({ error: "Permissions insuffisantes" }, { status: 403 });

  const rl = checkRateLimit(getClientIp(req), RATE_LIMITS.checkout);
  if (!rl.allowed)
    return NextResponse.json({ error: "Trop de requêtes, réessayez plus tard." }, { status: 429 });

  const raw = await req.json().catch(() => ({}));
  const parsed = ScrapeRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
  }

  const key = parsed.data.source ?? connectorKeys()[0];
  if (!connectorKeys().includes(key)) {
    return NextResponse.json({ error: `Source inconnue : ${key}` }, { status: 400 });
  }

  try {
    const result = await runScrape(key);
    await db.activityLog.create({
      data: {
        adminUserId: session.sub,
        action: "Scraping lancé manuellement",
        entity: "ScrapeRun",
        entityId: String(result.runId),
        details: `${key} → ${result.status}`,
      },
    });
    return NextResponse.json(result);
  } catch (err) {
    // Une exécution est déjà en cours pour cette source : ce n'est pas une
    // erreur serveur, on le dit clairement à l'administrateur.
    if (err instanceof Error && err.message.startsWith("SCRAPE_ALREADY_RUNNING")) {
      return NextResponse.json(
        { error: "Un scraping est déjà en cours pour cette source." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Erreur interne lors du scraping." }, { status: 500 });
  }
}
