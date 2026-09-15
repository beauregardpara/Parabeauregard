import "server-only";
import { randomUUID } from "crypto";

type StorageConfig = {
  url: string;
  key: string;
  bucket: string;
};

function getConfig(): StorageConfig | null {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_PRODUCT_IMAGES_BUCKET || "product-images";
  if (!url || !key) return null;
  return { url, key, bucket };
}

function headers(config: StorageConfig, contentType?: string): HeadersInit {
  return {
    Authorization: `Bearer ${config.key}`,
    apikey: config.key,
    ...(contentType ? { "Content-Type": contentType } : {}),
  };
}

export function getSupabaseStorageStatus() {
  const config = getConfig();
  return { configured: Boolean(config), bucket: config?.bucket ?? process.env.SUPABASE_PRODUCT_IMAGES_BUCKET ?? "product-images" };
}

export async function uploadSupabaseProductImage(input: {
  productId: number;
  bytes: ArrayBuffer;
  contentType: string;
  extension: string;
}): Promise<{ ok: true; url: string; path: string } | { ok: false; error: string }> {
  const config = getConfig();
  if (!config) return { ok: false, error: "Le stockage produit n’est pas configuré côté serveur." };

  const path = `products/${input.productId}/${randomUUID()}.${input.extension}`;
  const endpoint = `${config.url}/storage/v1/object/${encodeURIComponent(config.bucket)}/${path}`;
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { ...headers(config, input.contentType), "x-upsert": "false" },
      body: input.bytes,
      cache: "no-store",
    });
    if (!response.ok) return { ok: false, error: "Le stockage a refusé cette image." };
    return {
      ok: true,
      path,
      url: `${config.url}/storage/v1/object/public/${encodeURIComponent(config.bucket)}/${path}`,
    };
  } catch {
    return { ok: false, error: "Impossible de joindre le stockage image." };
  }
}

export async function deleteSupabaseProductImage(url: string, productId: number): Promise<{ ok: true; managed: boolean } | { ok: false; managed: boolean; error: string }> {
  const config = getConfig();
  if (!config) return { ok: false, managed: true, error: "Le stockage produit n’est pas configuré côté serveur." };

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: true, managed: false };
  }
  if (parsed.origin !== config.url) return { ok: true, managed: false };

  const prefix = `/storage/v1/object/public/${config.bucket}/products/${productId}/`;
  if (!parsed.pathname.startsWith(prefix)) return { ok: true, managed: false };
  const path = parsed.pathname.slice(`/storage/v1/object/public/${config.bucket}/`.length).split("/").map(decodeURIComponent).join("/");
  if (!path.startsWith(`products/${productId}/`) || path.includes("..")) return { ok: false, managed: true, error: "Chemin de fichier invalide." };

  try {
    const response = await fetch(`${config.url}/storage/v1/object/${config.bucket}/${path}`, {
      method: "DELETE",
      headers: headers(config),
      cache: "no-store",
    });
    if (!response.ok && response.status !== 404) return { ok: false, managed: true, error: "Le stockage n’a pas pu supprimer cette image." };
    return { ok: true, managed: true };
  } catch {
    return { ok: false, managed: true, error: "Impossible de joindre le stockage image." };
  }
}
