import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/security/rate-limit";
import {
  aiComparison,
  buildComparisonData,
  compareProducts,
} from "@/lib/compare";

const schema = z.object({
  ids: z
    .string()
    .max(80)
    .transform((s) => s.split(",").map((x) => Number(x)).filter((n) => !Number.isNaN(n) && n > 0)),
});

const ComparePostSchema = z.object({
  slugs: z.array(z.string().trim().min(1).max(120)).min(2).max(4),
  note: z.string().max(500).optional(),
});

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(ip, RATE_LIMITS.search);
  if (!rl.allowed) return NextResponse.json({ error: "Trop de requêtes." }, { status: 429 });

  const { searchParams } = new URL(req.url);
  const parsed = schema.safeParse({ ids: searchParams.get("ids") ?? "" });
  if (!parsed.success || parsed.data.ids.length === 0) {
    return NextResponse.json([]);
  }

  const products = await db.product.findMany({
    where: { id: { in: parsed.data.ids.slice(0, 4) }, status: "PUBLISHED" },
    include: {
      category: true,
      images: { orderBy: { order: "asc" }, take: 1 },
      reviews: { where: { status: "APPROVED" }, select: { rating: true } },
    },
  });

  return NextResponse.json(
    products.map(({ reviews, ...p }) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      brand: p.brand,
      price: p.price,
      promoPrice: p.promoPrice,
      imageUrl: p.images[0]?.url ?? null,
      stock: p.stock,
      unlimitedStock: p.unlimitedStock,
      categoryName: p.category?.name ?? null,
      sku: p.sku,
      description: p.shortDescription ?? null,
      avgRating:
        reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null,
      reviewsCount: reviews.length,
    }))
  );
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(ip, RATE_LIMITS.chat);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: "Trop de requêtes. Réessayez dans quelques instants." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
      }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Requête JSON invalide." }, { status: 400 });
  }

  const parsed = ComparePostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Paramètres invalides" },
      { status: 400 }
    );
  }

  const { slugs, note } = parsed.data;
  const products = await compareProducts(slugs);
  if ("error" in products) {
    return NextResponse.json({ ok: false, error: products.error }, { status: 404 });
  }

  const data = {
    products,
    features: buildComparisonData(products),
    ai: await aiComparison(products, note),
  };
  return NextResponse.json({ ok: true, data });
}
