import { db } from "@/lib/db";
import { absoluteUrl } from "@/config/site";

export const dynamic = "force-dynamic";

function xml(value: unknown): string {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

export async function GET() {
  const products = await db.product.findMany({
    where: { status: "PUBLISHED" },
    include: { images: { orderBy: { order: "asc" }, take: 1 } },
    orderBy: { updatedAt: "desc" },
  });
  const items = products.map((p) => {
    const price = p.promoPrice && p.promoPrice < p.price ? p.promoPrice : p.price;
    const availability = p.unlimitedStock || p.stock > 0 ? "in_stock" : "out_of_stock";
    const image = p.images[0]?.url ?? absoluteUrl("/og-default.jpg");
    return `<item><g:id>${xml(p.sku ?? p.id)}</g:id><g:title>${xml(p.name)}</g:title><g:description>${xml(p.shortDescription ?? p.description ?? p.name)}</g:description><g:link>${xml(absoluteUrl(`/produits/${p.slug}`))}</g:link><g:image_link>${xml(image)}</g:image_link><g:availability>${availability}</g:availability><g:price>${price.toFixed(2)} MAD</g:price>${p.brand ? `<g:brand>${xml(p.brand)}</g:brand>` : ""}${p.barcode ? `<g:gtin>${xml(p.barcode)}</g:gtin>` : ""}${p.sku ? `<g:mpn>${xml(p.sku)}</g:mpn>` : ""}</item>`;
  }).join("");
  const body = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel><title>Para Beauregard</title><link>${xml(absoluteUrl())}</link><description>Catalogue de produits Para Beauregard au Maroc</description>${items}</channel></rss>`;
  return new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600" } });
}
