"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  hashPassword,
  verifyPassword,
  setAdminSession,
  clearAdminSession,
  requireAdmin,
  requireRole,
  type AdminRole,
} from "@/lib/auth";
import {
  adminLoginSchema,
  createAdminUserSchema,
  couponSchema,
  orderStatusSchema,
  reviewModerationSchema,
  productStatusSchema,
  bulkProductSchema,
  adminProductSchema,
} from "@/lib/validation/schemas";
import { checkRateLimit, RATE_LIMITS, getServerActionIp } from "@/lib/security/rate-limit";
import { sendTransactionalEmail } from "@/lib/email";
import { statusLabel } from "@/lib/order-status";
import { canCancelAsDemo } from "@/lib/demo-data";
import { notifyStockAlerts } from "@/lib/product-alerts";
import { slugify } from "@/lib/format";
import { deleteSupabaseProductImage, uploadSupabaseProductImage } from "@/lib/storage/supabase-admin";
import { getSettingNumber, SETTING_KEYS } from "@/lib/settings";
import { ADMIN_PRODUCT_FILTER_KEYS, buildAdminProductWhere } from "@/lib/admin/product-filters";
import { CATALOGUE_TAG } from "@/lib/cache";
import { validateProductImage } from "@/lib/storage/file-validation";

// ── Helpers ────────────────────────────────────────────────────────

async function logAction(action: string, entity?: string, entityId?: string, details?: string) {
  try {
    const [admin, ip] = await Promise.all([requireAdmin(), getServerActionIp()]);
    await db.activityLog.create({
      data: { adminUserId: admin?.id ?? null, action, entity, entityId, details, ip },
    });
  } catch {}
}

// ── Authentification ─────────────────────────────────────────────

export async function loginAdmin(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  // Rate limiting par IP
  const ip = await getServerActionIp();
  const rl = checkRateLimit(ip, RATE_LIMITS.login);
  if (!rl.allowed) return { ok: false, error: "Trop de tentatives. Réessayez plus tard." };

  const parsed = adminLoginSchema.safeParse({
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: String(formData.get("password") ?? ""),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };

  const { email, password } = parsed.data;
  const admin = await db.adminUser.findUnique({ where: { email } });
  if (!admin || !admin.active || !verifyPassword(password, admin.passwordHash)) {
    return { ok: false, error: "Identifiants incorrects ou compte désactivé." };
  }

  await setAdminSession(admin.id, admin.email, admin.role);
  return { ok: true };
}

export async function logoutAdmin() {
  await clearAdminSession();
  redirect("/admin/login");
}

// ── Utilisateurs admin (SUPER_ADMIN uniquement) ─────────────────

export async function createAdminUser(formData: FormData) {
  await requireRole("SUPER_ADMIN");
  const parsed = createAdminUserSchema.safeParse({
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    name: String(formData.get("name") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
    role: String(formData.get("role") ?? "CATALOG_MANAGER"),
  });
  if (!parsed.success) return;

  const { email, name, password, role } = parsed.data;

  await db.adminUser.create({
    data: { email, name, passwordHash: hashPassword(password), role: role as AdminRole },
  });
  await logAction("Création utilisateur admin", "AdminUser", email, `rôle ${role}`);
  revalidatePath("/admin/utilisateurs");
}

export async function toggleAdminActive(formData: FormData) {
  const me = await requireRole("SUPER_ADMIN");
  const id = Number(formData.get("id"));
  const user = await db.adminUser.findUnique({ where: { id } });
  if (!user || user.id === me.id) return;
  await db.adminUser.update({ where: { id }, data: { active: !user.active } });
  await logAction(user.active ? "Désactivation" : "Activation", "AdminUser", String(id));
  revalidatePath("/admin/utilisateurs");
}

export async function changeAdminRole(formData: FormData) {
  await requireRole("SUPER_ADMIN");
  const id = Number(formData.get("id"));
  const role = String(formData.get("role"));
  if (!["SUPER_ADMIN", "CATALOG_MANAGER", "ORDER_MANAGER"].includes(role)) return;
  const target = await db.adminUser.findUnique({ where: { id } });
  if (!target) return;
  await db.adminUser.update({ where: { id }, data: { role: role as AdminRole } });
  await logAction("Changement de rôle", "AdminUser", String(id), role);
  revalidatePath("/admin/utilisateurs");
}

// ── Produits (CATALOG_MANAGER ou SUPER_ADMIN) ───────────────────

export async function updateProductStatus(formData: FormData) {
  await requireRole("SUPER_ADMIN", "CATALOG_MANAGER");
  const parsed = productStatusSchema.safeParse({
    id: Number(formData.get("id")),
    status: String(formData.get("status")),
  });
  if (!parsed.success) return;
  const { id, status } = parsed.data;

  await db.product.update({ where: { id }, data: { status: status as never } });
  await logAction(
    status === "PUBLISHED" ? "Publication produit" : status === "HIDDEN" ? "Masquage produit" : "Retour en validation",
    "Product",
    String(id)
  );
  revalidatePath("/admin/produits");
  // Le catalogue public est mis en cache : on l\'invalide pour que la
  // boutique reflète la modification immédiatement.
  revalidateTag(CATALOGUE_TAG);
}

export async function bulkProductAction(formData: FormData) {
  await requireRole("SUPER_ADMIN", "CATALOG_MANAGER");
  const expected = formData.get("expectedCount");
  const parsed = bulkProductSchema.safeParse({
    ids: formData.getAll("ids").map(Number).filter(Boolean),
    bulkAction: String(formData.get("bulkAction")),
    scope: String(formData.get("scope") || "page"),
    filters: Object.fromEntries(
      ADMIN_PRODUCT_FILTER_KEYS.map((key) => [key, String(formData.get(`filtre_${key}`) ?? "").trim()]).filter(
        ([, value]) => value
      )
    ),
    ...(expected != null && String(expected) !== "" ? { expectedCount: Number(expected) } : {}),
  });
  if (!parsed.success) return;
  const { bulkAction, scope, filters, expectedCount } = parsed.data;

  let ids = parsed.data.ids;
  if (scope === "filtered") {
    // On rejoue exactement le filtre de la liste : la sélection ne peut pas
    // déborder sur des produits que l'utilisateur ne voyait pas.
    const lowStockThreshold = (await getSettingNumber(SETTING_KEYS.lowStockAlerts)) || 3;
    const where = buildAdminProductWhere(filters, lowStockThreshold);
    const matching = await db.product.findMany({ where, select: { id: true } });
    ids = matching.map((p) => p.id);
    // La liste a pu changer depuis l'affichage : on refuse plutôt que d'agir à l'aveugle.
    if (expectedCount != null && expectedCount !== ids.length) return;
  }
  if (ids.length === 0) return;

  switch (bulkAction) {
    case "publish":
      await db.product.updateMany({ where: { id: { in: ids } }, data: { status: "PUBLISHED" } });
      break;
    case "hide":
      await db.product.updateMany({ where: { id: { in: ids } }, data: { status: "HIDDEN" } });
      break;
    case "pending":
      await db.product.updateMany({ where: { id: { in: ids } }, data: { status: "PENDING_REVIEW" } });
      break;
    case "archive":
      await db.product.updateMany({ where: { id: { in: ids } }, data: { status: "HIDDEN" } });
      break;
    case "delete": {
      await requireRole("SUPER_ADMIN");
      const products = await db.product.findMany({ where: { id: { in: ids } }, include: { images: true } });
      for (const product of products) {
        for (const image of product.images) {
          const storage = await deleteSupabaseProductImage(image.url, product.id);
          if (!storage.ok) throw new Error(storage.error);
        }
      }
      await db.product.deleteMany({ where: { id: { in: ids } } });
      break;
    }
  }
  await logAction(
    `Action masse : ${bulkAction}`,
    "Product",
    undefined,
    `${ids.length} produits${scope === "filtered" ? " (tout le filtre)" : ""}`
  );
  revalidatePath("/admin/produits");
  // Le catalogue public est mis en cache : on l\'invalide pour que la
  // boutique reflète la modification immédiatement.
  revalidateTag(CATALOGUE_TAG);
}

function formText(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function formNumber(formData: FormData, key: string): number {
  return Number(String(formData.get(key) ?? ""));
}

function readAdminProductForm(formData: FormData, id?: number) {
  const name = formText(formData, "name") ?? "";
  const rawSlug = formText(formData, "slug");
  const slug = rawSlug ? slugify(rawSlug).slice(0, 160) : slugify(name).slice(0, 160);
  return {
    ...(id ? { id } : {}),
    name,
    slug,
    sku: formText(formData, "sku"),
    brand: formText(formData, "brand"),
    categoryId: formNumber(formData, "categoryId") || null,
    shortDescription: formText(formData, "shortDescription"),
    description: formText(formData, "description"),
    price: formNumber(formData, "price"),
    promoPrice: formNumber(formData, "promoPrice") || null,
    stock: formNumber(formData, "stock"),
    lowStockThreshold: formNumber(formData, "lowStockThreshold"),
    unlimitedStock: formData.get("unlimitedStock") === "on",
    isFeatured: formData.get("isFeatured") === "on",
    status: String(formData.get("status") ?? "PENDING_REVIEW"),
  };
}

function adminSearchText(name: string, brand: string | null) {
  return `${name} ${brand ?? ""}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export async function createProduct(formData: FormData): Promise<{ ok: boolean; id?: number; error?: string }> {
  await requireRole("SUPER_ADMIN", "CATALOG_MANAGER");
  const parsed = adminProductSchema.safeParse(readAdminProductForm(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Données produit invalides." };
  const value = parsed.data;

  const [sameSlug, sameSku, category] = await Promise.all([
    db.product.findUnique({ where: { slug: value.slug }, select: { id: true } }),
    value.sku ? db.product.findFirst({ where: { sku: value.sku }, select: { id: true } }) : null,
    value.categoryId ? db.category.findUnique({ where: { id: value.categoryId }, select: { id: true } }) : null,
  ]);
  if (sameSlug) return { ok: false, error: "Ce slug existe déjà." };
  if (sameSku) return { ok: false, error: "Cette référence SKU existe déjà." };
  if (value.categoryId && !category) return { ok: false, error: "Catégorie introuvable." };

  try {
    const product = await db.product.create({
      data: {
        name: value.name,
        slug: value.slug,
        sku: value.sku,
        brand: value.brand,
        categoryId: value.categoryId,
        shortDescription: value.shortDescription,
        description: value.description,
        price: value.price,
        promoPrice: value.promoPrice,
        stock: value.stock,
        lowStockThreshold: value.lowStockThreshold,
        unlimitedStock: value.unlimitedStock,
        isFeatured: value.isFeatured,
        status: value.status,
        sourceName: "manuel",
        searchText: adminSearchText(value.name, value.brand),
      },
      select: { id: true },
    });
    await logAction("Création produit", "Product", String(product.id));
    revalidatePath("/admin/produits");
    // Le catalogue public est mis en cache : on l\'invalide pour que la
    // boutique reflète la modification immédiatement.
    revalidateTag(CATALOGUE_TAG);
    return { ok: true, id: product.id };
  } catch {
    return { ok: false, error: "Impossible de créer le produit. Vérifiez le slug et la référence." };
  }
}

/** Création depuis l'import catalogue : le fichier reste soumis aux mêmes
 * validations que le formulaire manuel, avec quelques champs catalogue en plus. */
export async function createImportedProduct(input: {
  name: string;
  slug?: string;
  sku?: string | null;
  barcode?: string | null;
  brand?: string | null;
  categoryId?: number | null;
  shortDescription?: string | null;
  description?: string | null;
  price: number;
  promoPrice?: number | null;
  stock?: number;
  lowStockThreshold?: number;
  unlimitedStock?: boolean;
  isFeatured?: boolean;
  isNew?: boolean;
  status?: "PENDING_REVIEW" | "PUBLISHED" | "HIDDEN";
}): Promise<{ ok: boolean; id?: number; error?: string }> {
  await requireRole("SUPER_ADMIN", "CATALOG_MANAGER");
  const formData = new FormData();
  for (const [key, value] of Object.entries({
    name: input.name,
    slug: input.slug ?? "",
    sku: input.sku ?? "",
    brand: input.brand ?? "",
    categoryId: input.categoryId ?? "",
    shortDescription: input.shortDescription ?? "",
    description: input.description ?? "",
    price: input.price,
    promoPrice: input.promoPrice ?? "",
    stock: input.stock ?? 0,
    lowStockThreshold: input.lowStockThreshold ?? 3,
    unlimitedStock: input.unlimitedStock ? "on" : "",
    isFeatured: input.isFeatured ? "on" : "",
    status: input.status ?? "PENDING_REVIEW",
  })) formData.set(key, String(value));

  const result = await createProduct(formData);
  if (!result.ok || !result.id) return result;
  await db.product.update({
    where: { id: result.id },
    data: { barcode: input.barcode?.trim() || null, isNew: input.isNew === true },
  });
  revalidatePath(`/admin/produits/${result.id}`);
  revalidateTag(CATALOGUE_TAG);
  return result;
}

export async function saveProductEdits(formData: FormData): Promise<{ ok: boolean; id?: number; error?: string }> {
  await requireRole("SUPER_ADMIN", "CATALOG_MANAGER");
  const id = Number(formData.get("id"));
  const existing = await db.product.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Produit introuvable." };
  const parsed = adminProductSchema.safeParse(readAdminProductForm(formData, id));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Données produit invalides." };
  const value = parsed.data;

  const [sameSlug, sameSku, category] = await Promise.all([
    db.product.findFirst({ where: { slug: value.slug, NOT: { id } }, select: { id: true } }),
    value.sku ? db.product.findFirst({ where: { sku: value.sku, NOT: { id } }, select: { id: true } }) : null,
    value.categoryId ? db.category.findUnique({ where: { id: value.categoryId }, select: { id: true } }) : null,
  ]);
  if (sameSlug) return { ok: false, error: "Ce slug est déjà utilisé par un autre produit." };
  if (sameSku) return { ok: false, error: "Cette référence SKU est déjà utilisée par un autre produit." };
  if (value.categoryId && !category) return { ok: false, error: "Catégorie introuvable." };

  const changedPrice = value.price !== existing.price;
  const changedStock = value.stock !== existing.stock;
  await db.$transaction([
    ...(changedPrice ? [db.priceHistory.create({ data: { productId: id, oldPrice: existing.price, newPrice: value.price, reason: "admin" } })] : []),
    ...(changedStock ? [db.stockHistory.create({ data: { productId: id, oldStock: existing.stock, newStock: value.stock, reason: "admin" } })] : []),
    db.product.update({
      where: { id },
      data: {
        name: value.name,
        slug: value.slug,
        sku: value.sku,
        brand: value.brand,
        categoryId: value.categoryId,
        shortDescription: value.shortDescription,
        description: value.description,
        price: value.price,
        promoPrice: value.promoPrice,
        stock: value.stock,
        lowStockThreshold: value.lowStockThreshold,
        unlimitedStock: value.unlimitedStock,
        isFeatured: value.isFeatured,
        status: value.status,
        searchText: adminSearchText(value.name, value.brand),
      },
    }),
  ]);

  await logAction("Édition produit", "Product", String(id));
  if ((!value.unlimitedStock && value.stock > 0 && existing.stock === 0) || (value.unlimitedStock && !existing.unlimitedStock)) {
    notifyStockAlerts(id).catch(() => undefined);
  }
  revalidatePath(`/admin/produits/${id}`);
  revalidatePath("/admin/produits");
  // Le catalogue public est mis en cache : on l\'invalide pour que la
  // boutique reflète la modification immédiatement.
  revalidateTag(CATALOGUE_TAG);
  return { ok: true };
}

export async function duplicateProduct(formData: FormData): Promise<void> {
  await requireRole("SUPER_ADMIN", "CATALOG_MANAGER");
  const id = Number(formData.get("id"));
  const source = await db.product.findUnique({ where: { id }, include: { images: { orderBy: { order: "asc" } } } });
  if (!source) return;
  const baseSlug = `${source.slug}-copie`;
  let slug = baseSlug;
  for (let i = 2; await db.product.findUnique({ where: { slug }, select: { id: true } }); i += 1) slug = `${baseSlug}-${i}`;
  const copy = await db.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        name: `${source.name} — copie`, slug, sku: null, brand: source.brand,
        shortDescription: source.shortDescription, description: source.description,
        price: source.price, promoPrice: source.promoPrice, stock: 0,
        lowStockThreshold: source.lowStockThreshold, unlimitedStock: source.unlimitedStock,
        isFeatured: false, isNew: false, status: "PENDING_REVIEW", sourceName: "manuel",
        categoryId: source.categoryId, searchText: adminSearchText(`${source.name} — copie`, source.brand),
      }, select: { id: true },
    });
    if (source.images.length) await tx.productImage.createMany({ data: source.images.map((image, order) => ({ productId: product.id, url: image.url, alt: image.alt, order })) });
    return product;
  });
  await logAction("Duplication produit", "Product", String(copy.id), `source=${id}`);
  revalidatePath("/admin/produits");
  // Le catalogue public est mis en cache : on l\'invalide pour que la
  // boutique reflète la modification immédiatement.
  revalidateTag(CATALOGUE_TAG);
  redirect(`/admin/produits/${copy.id}`);
}

export async function archiveProduct(formData: FormData) {
  await requireRole("SUPER_ADMIN", "CATALOG_MANAGER");
  const id = Number(formData.get("id"));
  await db.product.update({ where: { id }, data: { status: "HIDDEN" } });
  await logAction("Archivage produit", "Product", String(id));
  revalidatePath(`/admin/produits/${id}`);
  revalidatePath("/admin/produits");
  // Le catalogue public est mis en cache : on l\'invalide pour que la
  // boutique reflète la modification immédiatement.
  revalidateTag(CATALOGUE_TAG);
}

export async function updateProductImagesAction(
  productId: number,
  urls: string[]
): Promise<{ ok: boolean; error?: string }> {
  await requireRole("SUPER_ADMIN", "CATALOG_MANAGER");
  const product = await db.product.findUnique({ where: { id: productId } });
  if (!product) return { ok: false, error: "Produit introuvable." };

  const cleaned = (urls ?? [])
    .map((u) => String(u).trim())
    .filter((u) => u.length > 0 && u.length <= 2048)
    .slice(0, 12);

  const existing = await db.productImage.findMany({ where: { productId }, orderBy: { order: "asc" } });
  const existingByUrl = new Map(existing.map((image) => [image.url, image]));
  const removed = existing.filter((image) => !cleaned.includes(image.url));
  await db.$transaction(async (tx) => {
    await tx.productImage.deleteMany({ where: { id: { in: removed.map((image) => image.id) } } });
    for (const [order, url] of cleaned.entries()) {
      const image = existingByUrl.get(url);
      if (image) {
        await tx.productImage.update({ where: { id: image.id }, data: { order, alt: product.name } });
      } else {
        await tx.productImage.create({ data: { productId, url, order, alt: product.name } });
      }
    }
  });
  for (const image of removed) await deleteSupabaseProductImage(image.url, productId);
  await logAction("Édition images produit", "Product", String(productId));
  revalidatePath(`/admin/produits/${productId}`);
  revalidatePath("/admin/produits");
  // Le catalogue public est mis en cache : on l\'invalide pour que la
  // boutique reflète la modification immédiatement.
  revalidateTag(CATALOGUE_TAG);
  return { ok: true };
}

/** Upload protégé côté serveur vers le bucket public product-images. */
export async function uploadProductImageAction(formData: FormData): Promise<{ ok: boolean; url?: string; error?: string }> {
  await requireRole("SUPER_ADMIN", "CATALOG_MANAGER");
  const productId = Number(formData.get("productId"));
  const file = formData.get("file");
  if (!Number.isInteger(productId) || !(file instanceof File)) return { ok: false, error: "Fichier ou produit invalide." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const validation = validateProductImage({ size: file.size, type: file.type, bytes });
  if (!validation.ok) return validation;
  const extension = validation.extension;
  const product = await db.product.findUnique({ where: { id: productId }, select: { id: true, name: true } });
  if (!product) return { ok: false, error: "Produit introuvable." };

  const upload = await uploadSupabaseProductImage({ productId, bytes: bytes.buffer, contentType: file.type, extension });
  if (!upload.ok) return upload;
  try {
    const last = await db.productImage.findFirst({ where: { productId }, orderBy: { order: "desc" }, select: { order: true } });
    await db.productImage.create({ data: { productId, url: upload.url, alt: product.name, order: (last?.order ?? -1) + 1 } });
    await logAction("Ajout image produit", "Product", String(productId));
    revalidatePath(`/admin/produits/${productId}`);
    revalidatePath("/admin/produits");
    // Le catalogue public est mis en cache : on l\'invalide pour que la
    // boutique reflète la modification immédiatement.
    revalidateTag(CATALOGUE_TAG);
    return { ok: true, url: upload.url };
  } catch {
    await deleteSupabaseProductImage(upload.url, productId);
    return { ok: false, error: "Impossible de joindre le stockage image." };
  }
}

export async function deleteProductImageAction(productId: number, imageId: number): Promise<{ ok: boolean; error?: string }> {
  await requireRole("SUPER_ADMIN", "CATALOG_MANAGER");
  const image = await db.productImage.findFirst({ where: { id: imageId, productId }, select: { id: true, url: true } });
  if (!image) return { ok: false, error: "Image introuvable." };
  const storage = await deleteSupabaseProductImage(image.url, productId);
  if (!storage.ok) return { ok: false, error: storage.error };
  const remaining = await db.productImage.findMany({ where: { productId, id: { not: image.id } }, orderBy: { order: "asc" }, select: { id: true } });
  await db.$transaction([
    db.productImage.delete({ where: { id: image.id } }),
    ...remaining.map((item, order) => db.productImage.update({ where: { id: item.id }, data: { order } })),
  ]);
  await logAction("Suppression image produit", "ProductImage", String(image.id));
  revalidatePath(`/admin/produits/${productId}`);
  revalidateTag(CATALOGUE_TAG);
  return { ok: true };
}

export async function setPrimaryProductImageAction(productId: number, imageId: number): Promise<{ ok: boolean; error?: string }> {
  await requireRole("SUPER_ADMIN", "CATALOG_MANAGER");
  const images = await db.productImage.findMany({ where: { productId }, orderBy: { order: "asc" }, select: { id: true } });
  if (!images.some((image) => image.id === imageId)) return { ok: false, error: "Image introuvable." };
  await db.$transaction(images.map((image, order) => db.productImage.update({ where: { id: image.id }, data: { order: image.id === imageId ? 0 : order < images.findIndex((item) => item.id === imageId) ? order + 1 : order } })));
  revalidatePath(`/admin/produits/${productId}`);
  revalidateTag(CATALOGUE_TAG);
  return { ok: true };
}

export async function reorderProductImagesAction(productId: number, imageIds: number[]): Promise<{ ok: boolean; error?: string }> {
  await requireRole("SUPER_ADMIN", "CATALOG_MANAGER");
  const images = await db.productImage.findMany({ where: { productId }, select: { id: true } });
  const allowed = new Set(images.map((image) => image.id));
  if (imageIds.length !== images.length || imageIds.some((id) => !allowed.has(id))) return { ok: false, error: "Ordre d’images invalide." };
  await db.$transaction(imageIds.map((id, order) => db.productImage.update({ where: { id }, data: { order } })));
  revalidatePath(`/admin/produits/${productId}`);
  revalidateTag(CATALOGUE_TAG);
  return { ok: true };
}

export async function deleteProduct(formData: FormData) {
  await requireRole("SUPER_ADMIN", "CATALOG_MANAGER");
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) return;
  const product = await db.product.findUnique({ where: { id }, include: { images: true } });
  if (!product) return;
  for (const image of product.images) {
    const storage = await deleteSupabaseProductImage(image.url, id);
    if (!storage.ok) throw new Error(storage.error);
  }
  await db.product.delete({ where: { id } });
  await logAction("Suppression produit", "Product", String(id));
  revalidatePath("/admin/produits");
  // Le catalogue public est mis en cache : on l\'invalide pour que la
  // boutique reflète la modification immédiatement.
  revalidateTag(CATALOGUE_TAG);
  redirect("/admin/produits");
}

// ── Catégories (CATALOG_MANAGER ou SUPER_ADMIN) ─────────────────

export async function saveCategory(formData: FormData) {
  await requireRole("SUPER_ADMIN", "CATALOG_MANAGER");
  const idRaw = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const icon = String(formData.get("icon") ?? "").trim() || null;
  const parentIdRaw = String(formData.get("parentId") ?? "");
  const parentId = parentIdRaw ? parseInt(parentIdRaw) : null;
  const order = parseInt(String(formData.get("order") ?? "0")) || 0;
  if (!name) return;

  const slug =
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") +
    (idRaw ? "" : `-${Date.now().toString(36)}`);

  const data = { name, icon, parentId, order };
  if (idRaw) {
    await db.category.update({ where: { id: parseInt(idRaw) }, data: { ...data, slug } });
  } else {
    await db.category.create({ data: { ...data, slug } });
  }
  await logAction(idRaw ? "Édition catégorie" : "Création catégorie", "Category", idRaw || slug, name);
  revalidatePath("/admin/categories");
  revalidateTag(CATALOGUE_TAG);
}

export async function deleteCategory(formData: FormData) {
  await requireRole("SUPER_ADMIN", "CATALOG_MANAGER");
  const id = Number(formData.get("id"));
  await db.product.updateMany({ where: { categoryId: id }, data: { categoryId: null } });
  await db.category.deleteMany({ where: { OR: [{ id }, { parentId: id }] } });
  await logAction("Suppression catégorie", "Category", String(id));
  revalidatePath("/admin/categories");
  revalidateTag(CATALOGUE_TAG);
}

// ── Commandes (ORDER_MANAGER ou SUPER_ADMIN) ────────────────────

const VALID_ORDER_TRANSITIONS: Record<string, string[]> = {
  NEW: ["PREPARING", "CANCELLED"],
  PREPARING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "CANCELLED"],
  DELIVERED: [], // état final
  CANCELLED: [], // état final
};

export async function updateOrderStatus(formData: FormData) {
  await requireRole("SUPER_ADMIN", "ORDER_MANAGER");
  const parsed = orderStatusSchema.safeParse({
    id: Number(formData.get("id")),
    status: String(formData.get("status")),
  });
  if (!parsed.success) return;
  const { id, status: newStatus } = parsed.data;

  const order = await db.order.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!order) return;

  const allowed = VALID_ORDER_TRANSITIONS[order.status] ?? [];
  if (!allowed.includes(newStatus) && newStatus !== order.status) return;

  // Annulation : compenser stock, fidélité et coupon dans une transaction atomique
  if (newStatus === "CANCELLED" && order.status !== "CANCELLED") {
    await db.$transaction(async (tx) => {
      // Restaurer le stock et retirer les ventes (uniquement stock réel, pas "quantité non garantie")
      for (const item of order.items) {
        if (!item.productId) continue;
        const prod = await tx.product.findUnique({
          where: { id: item.productId },
          select: { unlimitedStock: true },
        });
        if (!prod) continue;
        if (!prod.unlimitedStock) {
          await tx.product.updateMany({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
        await tx.product.updateMany({
          where: { id: item.productId },
          data: { soldCount: { decrement: item.quantity } },
        });
      }
      // Révoquer les points de fidélité gagnés
      if (order.customerId && order.pointsEarned > 0) {
        await tx.customer.update({
          where: { id: order.customerId },
          data: { loyaltyPoints: { decrement: order.pointsEarned } },
        });
        await tx.loyaltyTransaction.create({
          data: {
            customerId: order.customerId,
            type: "SPENT",
            amount: order.pointsEarned,
            label: `Annulation commande ${order.reference}`,
            orderId: order.id,
          },
        });
      }
      // Réduire le compteur d'usage du coupon
      if (order.couponCode) {
        await tx.coupon.updateMany({
          where: { code: order.couponCode, usedCount: { gt: 0 } },
          data: { usedCount: { decrement: 1 } },
        });
      }
      await tx.order.update({
        where: { id },
        data: { status: "CANCELLED" },
      });
      await tx.orderStatusHistory.create({
        data: { orderId: id, from: order.status, to: "CANCELLED", note: "Commande annulée" },
      });
    });
  } else {
    await db.order.update({
      where: { id },
      data: { status: newStatus as never, ...(newStatus === "DELIVERED" ? { paid: true } : {}) },
    });
    await db.orderStatusHistory.create({
      data: { orderId: id, from: order.status, to: newStatus as never },
    });
    await sendTransactionalEmail({
      to: order.email,
      template: "order-status",
      data: {
        reference: order.reference,
        status: newStatus,
        statusLabel: statusLabel(newStatus),
      },
    });
  }

  await logAction("Statut commande", "Order", String(id), `${order.status} → ${newStatus}`);
  if (newStatus === "CANCELLED" && order.status !== "CANCELLED") {
    await sendTransactionalEmail({
      to: order.email,
      template: "order-status",
      data: {
        reference: order.reference,
        status: "CANCELLED",
        statusLabel: statusLabel("CANCELLED"),
        note: "La commande a été annulée. Aucun montant ne vous sera demandé.",
      },
    });
  }
  revalidatePath("/admin/commandes");
  revalidatePath(`/admin/commandes/${id}`);
}

/**
 * Annulation d'une commande de démonstration / QA (adresse email réservée aux
 * tests). Contrairement à l'annulation normale, aucun mouvement de stock ni
 * email : ces commandes n'ont pas toujours décrémenté le stock réel. L'historique
 * est conservé (rien n'est supprimé).
 */
export async function cancelDemoOrder(formData: FormData) {
  await requireRole("SUPER_ADMIN");
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) return;
  const order = await db.order.findUnique({ where: { id } });
  if (!order || !canCancelAsDemo(order)) return;

  await db.$transaction(async (tx) => {
    if (order.customerId && order.pointsEarned > 0) {
      await tx.customer.update({
        where: { id: order.customerId },
        data: { loyaltyPoints: { decrement: order.pointsEarned } },
      });
    }
    await tx.order.update({ where: { id }, data: { status: "CANCELLED" } });
    await tx.orderStatusHistory.create({
      data: {
        orderId: id,
        from: order.status,
        to: "CANCELLED",
        note: "Commande de démonstration/QA annulée — stock non modifié",
      },
    });
  });
  await logAction("Annulation commande démo", "Order", String(id), order.reference);
  revalidatePath("/admin/commandes");
  revalidatePath(`/admin/commandes/${id}`);
}

// ── Avis (CATALOG_MANAGER ou SUPER_ADMIN) ───────────────────────

export async function moderateReview(formData: FormData) {
  await requireRole("SUPER_ADMIN", "CATALOG_MANAGER");
  const parsed = reviewModerationSchema.safeParse({
    id: Number(formData.get("id")),
    decision: String(formData.get("decision")),
  });
  if (!parsed.success) return;
  const { id, decision } = parsed.data;

  await db.review.update({ where: { id }, data: { status: decision as never } });
  await logAction(`Modération avis (${decision})`, "Review", String(id));
  revalidatePath("/admin/avis");
}

export async function toggleVerifiedReview(formData: FormData) {
  await requireRole("SUPER_ADMIN", "CATALOG_MANAGER");
  const id = Number(formData.get("id"));
  const review = await db.review.findUnique({ where: { id }, select: { verifiedPurchase: true } });
  if (!review) return;
  await db.review.update({
    where: { id },
    data: { verifiedPurchase: !review.verifiedPurchase },
  });
  await logAction(`Achat vérifié: ${!review.verifiedPurchase ? "oui" : "non"}`, "Review", String(id));
  revalidatePath("/admin/avis");
}

// ── Codes promo (CATALOG_MANAGER ou SUPER_ADMIN) ────────────────

export async function saveCoupon(formData: FormData) {
  await requireRole("SUPER_ADMIN", "CATALOG_MANAGER");
  const usageLimitRaw = String(formData.get("usageLimit") ?? "").trim();
  const startsAtRaw = String(formData.get("startsAt") ?? "").trim();
  const endsAtRaw = String(formData.get("endsAt") ?? "").trim();
  const parsed = couponSchema.safeParse({
    code: String(formData.get("code") ?? "").trim().toUpperCase(),
    type: String(formData.get("type") === "FIXED" ? "FIXED" : "PERCENT"),
    value: parseFloat(String(formData.get("value") ?? "0")),
    minOrder: parseFloat(String(formData.get("minOrder") ?? "0")) || 0,
    usageLimit: usageLimitRaw ? parseInt(usageLimitRaw) : null,
  });
  if (!parsed.success) return;

  const { code, type, value, minOrder, usageLimit } = parsed.data;
  const startsAt = startsAtRaw ? new Date(startsAtRaw) : null;
  const endsAt = endsAtRaw ? new Date(endsAtRaw) : null;
  if (startsAt && Number.isNaN(startsAt.getTime())) return;
  if (endsAt && Number.isNaN(endsAt.getTime())) return;

  try {
    await db.coupon.create({
      data: {
        code,
        type: type as never,
        value,
        minOrder,
        usageLimit: usageLimit ?? null,
        startsAt,
        endsAt,
      },
    });
  } catch {
    return;
  }
  await logAction("Création code promo", "Coupon", code);
  revalidatePath("/admin/promotions");
}

export async function toggleCoupon(formData: FormData) {
  await requireRole("SUPER_ADMIN", "CATALOG_MANAGER");
  const id = Number(formData.get("id"));
  const c = await db.coupon.findUnique({ where: { id } });
  if (!c) return;
  await db.coupon.update({ where: { id }, data: { active: !c.active } });
  await logAction(c.active ? "Désactivation code" : "Activation code", "Coupon", c.code);
  revalidatePath("/admin/promotions");
}

// ── Scraper & paramètres (CATALOG_MANAGER ou SUPER_ADMIN) ────────

export async function saveScraperSettings(formData: FormData) {
  await requireRole("SUPER_ADMIN", "CATALOG_MANAGER");
  const frequency = Math.max(1, parseInt(String(formData.get("frequency") ?? "6")) || 6);
  const autoPublish = formData.get("autoPublish") === "on";

  await db.setting.upsert({
    where: { key: "scrape_frequency_hours" },
    update: { value: String(frequency) },
    create: { key: "scrape_frequency_hours", value: String(frequency) },
  });
  await db.setting.upsert({
    where: { key: "auto_publish" },
    update: { value: autoPublish ? "true" : "false" },
    create: { key: "auto_publish", value: autoPublish ? "true" : "false" },
  });
  await logAction("Paramètres scraper", "Setting", undefined, `${frequency}h, auto=${autoPublish}`);
  revalidatePath("/admin/scraper");
}
