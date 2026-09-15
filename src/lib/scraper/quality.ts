import { db } from "@/lib/db";

export type QualityIssueType =
  | "NO_IMAGE"
  | "NO_DESCRIPTION"
  | "ZERO_PRICE"
  | "INCOHERENT_PROMO"
  | "DUPLICATE_NAME"
  | "SHORT_NAME";

export type QualityIssue = {
  type: QualityIssueType;
  severity: 1 | 2 | 3;
  details: string;
};

export type QualityProduct = {
  id?: number;
  name: string;
  shortDescription?: string | null;
  description?: string | null;
  price: number;
  promoPrice?: number | null;
  imageCount: number;
};

export type ComputeQualityOptions = {
  duplicateCount?: number;
};

export const ISSUE_LABELS: Record<string, string> = {
  NO_IMAGE: "Aucune image",
  NO_DESCRIPTION: "Description manquante",
  ZERO_PRICE: "Prix nul",
  INCOHERENT_PROMO: "Promo incohérente",
  DUPLICATE_NAME: "Nom dupliqué",
  SHORT_NAME: "Nom trop court",
};

export const SEVERITY_LABELS: Record<string, string> = {
  "1": "Mineur",
  "2": "Important",
  "3": "Bloquant",
};

const SEVERITY_PENALTY: Record<1 | 2 | 3, number> = { 1: 5, 2: 15, 3: 25 };

export function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function computeProductQuality(
  product: QualityProduct,
  options?: ComputeQualityOptions
): { score: number; issues: QualityIssue[] } {
  const issues: QualityIssue[] = [];

  const trimmedName = product.name.trim();
  if (trimmedName.length < 8) {
    issues.push({
      type: "SHORT_NAME",
      severity: 1,
      details: `Nom trop court (${trimmedName.length} caractères).`,
    });
  }

  if (!Number.isFinite(product.price) || product.price <= 0) {
    issues.push({
      type: "ZERO_PRICE",
      severity: 3,
      details: "Prix manquant ou inférieur ou égal à zéro.",
    });
  }

  if (product.imageCount === 0) {
    issues.push({
      type: "NO_IMAGE",
      severity: 2,
      details: "Aucune image rattachée au produit.",
    });
  }

  const filledDescription = product.description?.trim() || product.shortDescription?.trim();
  if (!filledDescription) {
    issues.push({
      type: "NO_DESCRIPTION",
      severity: 1,
      details: "Ni description ni résumé renseigné.",
    });
  }

  const promoPrice = product.promoPrice;
  if (promoPrice != null && (promoPrice >= product.price || product.price - promoPrice > product.price * 0.7)) {
    issues.push({
      type: "INCOHERENT_PROMO",
      severity: 1,
      details: "Promotion incohérente avec le prix de base.",
    });
  }

  const duplicateCount = options?.duplicateCount ?? 0;
  if (duplicateCount > 0) {
    issues.push({
      type: "DUPLICATE_NAME",
      severity: 2,
      details: `${duplicateCount} autre(s) produit(s) au nom normalisé identique.`,
    });
  }

  const penalty = issues.reduce((sum, issue) => sum + SEVERITY_PENALTY[issue.severity], 0);
  return { score: Math.max(0, 100 - penalty), issues };
}

const BATCH_SIZE = 500;

type PublishedProductRow = {
  id: number;
  name: string;
  shortDescription: string | null;
  description: string | null;
  price: number;
  promoPrice: number | null;
  _count: { images: number };
};

async function upsertOpenIssue(productId: number, issue: QualityIssue) {
  const existing = await db.dataQualityIssue.findFirst({
    where: { productId, type: issue.type, status: "OPEN" },
  });
  if (existing) {
    if (existing.severity !== issue.severity || existing.details !== issue.details) {
      await db.dataQualityIssue.update({
        where: { id: existing.id },
        data: { severity: issue.severity, details: issue.details },
      });
    }
    return;
  }
  await db.dataQualityIssue.create({
    data: { productId, type: issue.type, severity: issue.severity, details: issue.details, status: "OPEN" },
  });
}

async function reconcileIssues(byProduct: Map<number, QualityIssue[]>) {
  const productIds = [...byProduct.keys()];
  const existing = await db.dataQualityIssue.findMany({
    where: { productId: { in: productIds }, status: "OPEN" },
  });

  const toResolve: number[] = [];
  for (const row of existing) {
    if (row.productId == null) continue;
    const desired = byProduct.get(row.productId)?.some((issue) => issue.type === row.type) ?? false;
    if (!desired) toResolve.push(row.id);
  }
  if (toResolve.length > 0) {
    await db.dataQualityIssue.updateMany({
      where: { id: { in: toResolve } },
      data: { status: "RESOLVED", resolvedAt: new Date() },
    });
  }

  for (const [productId, issues] of byProduct) {
    for (const issue of issues) {
      await upsertOpenIssue(productId, issue);
    }
  }
}

export async function syncProductQuality(productId: number): Promise<number> {
  const product = await db.product.findUnique({
    where: { id: productId },
    include: { _count: { select: { images: true } } },
  });
  if (!product) throw new Error(`Produit introuvable : ${productId}`);

  const normalized = normalizeName(product.name);
  let duplicateCount = 0;
  if (normalized) {
    const others = await db.product.findMany({
      where: { id: { not: productId } },
      select: { name: true },
    });
    duplicateCount = others.filter((other) => normalizeName(other.name) === normalized).length;
  }

  const { score, issues } = computeProductQuality(
    { ...product, imageCount: product._count.images },
    { duplicateCount }
  );

  await db.product.update({ where: { id: productId }, data: { qualityScore: score } });
  await reconcileIssues(new Map([[productId, issues]]));
  return score;
}

export async function recomputeCatalogQuality(): Promise<{ scored: number; averageScore: number; openIssues: number }> {
  const products: PublishedProductRow[] = [];
  for (let offset = 0; ; offset += BATCH_SIZE) {
    const chunk = await db.product.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { id: "asc" },
      skip: offset,
      take: BATCH_SIZE,
      select: {
        id: true,
        name: true,
        shortDescription: true,
        description: true,
        price: true,
        promoPrice: true,
        _count: { select: { images: true } },
      },
    });
    if (chunk.length === 0) break;
    products.push(...chunk);
  }

  const nameCounts = new Map<string, number>();
  for (const product of products) {
    const key = normalizeName(product.name);
    if (key) nameCounts.set(key, (nameCounts.get(key) ?? 0) + 1);
  }

  const results: { id: number; score: number; issues: QualityIssue[] }[] = products.map((product) => {
    const key = normalizeName(product.name);
    const duplicateCount = key ? (nameCounts.get(key) ?? 0) - 1 : 0;
    const { score, issues } = computeProductQuality(
      {
        name: product.name,
        shortDescription: product.shortDescription,
        description: product.description,
        price: product.price,
        promoPrice: product.promoPrice,
        imageCount: product._count.images,
      },
      { duplicateCount }
    );
    return { id: product.id, score, issues };
  });

  for (let i = 0; i < results.length; i += BATCH_SIZE) {
    const batch = results.slice(i, i + BATCH_SIZE);
    await db.$transaction(
      batch.map((result) =>
        db.product.update({ where: { id: result.id }, data: { qualityScore: result.score } })
      )
    );
    await reconcileIssues(new Map(batch.map((result) => [result.id, result.issues])));
  }

  const totalScore = results.reduce((sum, result) => sum + result.score, 0);
  const averageScore = results.length > 0 ? Math.round((totalScore / results.length) * 100) / 100 : 0;
  const openIssues = await db.dataQualityIssue.count({ where: { status: "OPEN" } });
  return { scored: results.length, averageScore, openIssues };
}