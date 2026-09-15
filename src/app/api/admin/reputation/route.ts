import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAdminSession, hasPermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { isFirecrawlConfigured, searchProductReputation } from "@/lib/firecrawl";
import { saveProductReputation } from "@/lib/reputation";
import { checkRateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";

const Body = z.object({ productId: z.number().int().positive() });

async function authorized(permission: string) {
  const session = await getAdminSession();
  if (!session) return { response: NextResponse.json({ error: "Non autorisé" }, { status: 401 }) };
  if (!hasPermission(session.role as Parameters<typeof hasPermission>[0], permission)) return { response: NextResponse.json({ error: "Permissions insuffisantes" }, { status: 403 }) };
  return { session };
}

export async function GET() {
  const auth = await authorized("reputation:read");
  if (auth.response) return auth.response;
  const [analyzed, stale, errors, sources] = await Promise.all([
    db.productReputation.count({ where: { status: "READY" } }),
    db.productReputation.count({ where: { status: "STALE" } }),
    db.productReputation.count({ where: { status: "ERROR" } }),
    db.productReputation.findMany({ select: { sourcesJson: true } }),
  ]);
  const sourceCount = sources.reduce((sum, row) => {
    try { return sum + (Array.isArray(JSON.parse(row.sourcesJson)) ? JSON.parse(row.sourcesJson).length : 0); } catch { return sum; }
  }, 0);
  return NextResponse.json({ configured: isFirecrawlConfigured(), analyzed, stale, errors, sources: sourceCount });
}

export async function POST(request: NextRequest) {
  const auth = await authorized("reputation:write");
  if (auth.response) return auth.response;
  const session = auth.session!;
  const limit = checkRateLimit(`admin:${session.sub}`, RATE_LIMITS.reputation);
  if (!limit.allowed) return NextResponse.json({ error: "Limite d'analyses atteinte, réessayez plus tard." }, { status: 429 });
  if (!isFirecrawlConfigured()) return NextResponse.json({ error: "Firecrawl non configuré." }, { status: 503 });
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "productId invalide" }, { status: 400 });
  const product = await db.product.findUnique({ where: { id: parsed.data.productId }, select: { id: true, name: true, brand: true } });
  if (!product) return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
  const sources = await searchProductReputation(product.name, product.brand);
  const snapshot = await saveProductReputation(product.id, sources);
  await db.activityLog.create({ data: { adminUserId: session.sub, action: "Analyse réputation web", entity: "ProductReputation", entityId: String(product.id), details: `${sources.length} source(s)` } });
  return NextResponse.json(snapshot);
}

export async function DELETE(request: NextRequest) {
  const auth = await authorized("reputation:write");
  if (auth.response) return auth.response;
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "productId invalide" }, { status: 400 });
  await db.productReputation.deleteMany({ where: { productId: parsed.data.productId } });
  return NextResponse.json({ ok: true });
}
