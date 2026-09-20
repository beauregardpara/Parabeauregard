"use client";

import { unzipSync } from "fflate";
import { useRef, useState, useTransition } from "react";
import { FileArchive } from "lucide-react";
import { createImportedProduct, uploadProductImageAction } from "@/lib/actions/admin";
import { compressProductImage, MAX_UPLOAD_BYTES } from "@/lib/image-compress";

type Category = { id: number; name: string; slug: string };
type ImportedImage = string | { path: string; alt?: string };
type ImportedProduct = {
  name: string;
  slug?: string;
  sku?: string | null;
  barcode?: string | null;
  brand?: string | null;
  categoryId?: number | null;
  categorySlug?: string | null;
  categoryName?: string | null;
  category?: string | null;
  shortDescription?: string | null;
  description?: string | null;
  price: number;
  promoPrice?: number | null;
  stock?: number;
  lowStockThreshold?: number;
  unlimitedStock?: boolean;
  isFeatured?: boolean;
  isNew?: boolean;
  status?: string;
  priority?: boolean;
  images?: ImportedImage[];
};

type ZipFiles = Record<string, Uint8Array>;

function imageType(path: string) {
  const extension = path.toLowerCase().split(".").pop();
  return extension === "jpg" || extension === "jpeg" ? "image/jpeg" : extension === "png" ? "image/png" : "image/webp";
}

function imagePath(value: ImportedImage) {
  return typeof value === "string" ? value : value.path;
}

function parseProducts(text: string): ImportedProduct[] {
  const parsed = JSON.parse(text) as ImportedProduct[] | { products?: ImportedProduct[] };
  const products = Array.isArray(parsed) ? parsed : parsed.products;
  if (!Array.isArray(products) || products.length === 0) throw new Error("Le fichier products.json ne contient aucun produit.");
  if (products.length > 100) throw new Error("Un import est limité à 100 produits à la fois.");
  return products;
}

function findZipFile(files: ZipFiles, path: string) {
  const normalized = path.replace(/^\.\//, "").replace(/^\//, "");
  return files[normalized] ?? files[`images/${normalized.replace(/^images\//, "")}`];
}

function normalizeLabel(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function resolveCategoryId(product: ImportedProduct, categories: Category[]) {
  if (product.categoryId) {
    const match = categories.find((category) => category.id === product.categoryId);
    if (match) return match.id;
  }
  const requested = product.categorySlug ?? product.categoryName ?? product.category ?? "";
  if (!requested) return null;
  const label = normalizeLabel(requested);
  const exact = categories.find((category) => normalizeLabel(category.slug) === label || normalizeLabel(category.name) === label);
  if (exact) return exact.id;
  const partial = categories.find((category) => {
    const candidate = normalizeLabel(category.name);
    return candidate.includes(label) || label.includes(candidate) || label.split(" ").some((word) => word.length > 3 && candidate.includes(word));
  });
  return partial?.id ?? null;
}

function normalizeStatus(value: string | undefined) {
  const status = (value ?? "PENDING_REVIEW").trim().toUpperCase();
  if (["PENDING", "PENDING_REVIEW", "DRAFT", "REVIEW"].includes(status)) return "PENDING_REVIEW" as const;
  if (["PUBLISHED", "PUBLISH", "PUBLIC", "LIVE"].includes(status)) return "PUBLISHED" as const;
  if (["HIDDEN", "HIDE", "ARCHIVED", "ARCHIVE", "MASQUE"].includes(status)) return "HIDDEN" as const;
  return null;
}

export function AdminProductImport({ categories }: { categories: Category[] }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function importFile(file: File) {
    setMessage(null);
    setError(null);
    const files: ZipFiles = {};
    let productsText: string;
    if (file.name.toLowerCase().endsWith(".zip")) {
      const unzipped = unzipSync(new Uint8Array(await file.arrayBuffer()));
      for (const [path, bytes] of Object.entries(unzipped)) files[path.replace(/\\/g, "/")] = bytes;
      const json = files["products.json"];
      if (!json) throw new Error("Le ZIP doit contenir un fichier products.json à sa racine.");
      productsText = new TextDecoder().decode(json);
    } else if (file.name.toLowerCase().endsWith(".json")) {
      productsText = await file.text();
    } else {
      throw new Error("Format accepté : .zip ou .json.");
    }

    const products = parseProducts(productsText);
    let created = 0;
    let photos = 0;
    const failures: string[] = [];
    const categoriesById = new Map(categories.map((category) => [category.id, category.id]));
    const categoriesBySlug = new Map(categories.map((category) => [category.slug, category.id]));

    for (const [index, product] of products.entries()) {
      if (!product.name || typeof product.price !== "number") {
        failures.push(`Produit ${index + 1} : nom ou prix manquant.`);
        continue;
      }
      const status = normalizeStatus(product.status);
      if (!status) {
        failures.push(`${product.name} : statut inconnu (${product.status}).`);
        continue;
      }
      const categoryId = product.categoryId && categoriesById.get(product.categoryId)
        ? product.categoryId
        : product.categorySlug ? categoriesBySlug.get(product.categorySlug) ?? resolveCategoryId(product, categories)
          : resolveCategoryId(product, categories);
      const result = await createImportedProduct({
        ...product,
        categoryId,
        shortDescription: product.shortDescription ?? product.description?.slice(0, 180) ?? null,
        isFeatured: product.isFeatured ?? product.priority === true,
        status,
      });
      if (!result.ok || !result.id) {
        failures.push(`${product.name} : ${result.error ?? "création impossible"}`);
        continue;
      }
      created += 1;
      for (const image of (product.images ?? []).slice(0, 12)) {
        const path = imagePath(image);
        const bytes = findZipFile(files, path);
        if (!bytes) {
          failures.push(`${product.name} : image introuvable (${path}).`);
          continue;
        }
        const copiedBytes = new Uint8Array(bytes);
        const original = new File([copiedBytes.buffer as ArrayBuffer], path.split("/").pop() || "image.webp", { type: imageType(path) });
        const compressed = await compressProductImage(original);
        if (compressed.size > MAX_UPLOAD_BYTES) {
          failures.push(`${product.name} : image trop lourde (${path}).`);
          continue;
        }
        const data = new FormData();
        data.set("productId", String(result.id));
        data.set("file", compressed);
        const uploaded = await uploadProductImageAction(data).catch(() => ({ ok: false as const }));
        if (uploaded.ok) photos += 1;
        else failures.push(`${product.name} : échec de l’image ${path}.`);
      }
    }
    setMessage(`${created} produit(s) créé(s), ${photos} photo(s) importée(s).${failures.length ? ` ${failures.length} problème(s) à vérifier.` : ""}`);
    if (failures.length) setError(failures.slice(0, 8).join("\n"));
  }

  function selectFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    startTransition(() => { void importFile(file).catch((reason) => setError(reason instanceof Error ? reason.message : "Import impossible.")); });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input ref={inputRef} type="file" accept=".zip,.json,application/zip,application/json" onChange={selectFile} className="sr-only" />
      <button type="button" onClick={() => inputRef.current?.click()} disabled={pending}
        className="btn-3d inline-flex items-center gap-1.5 rounded-xl border border-para-200 bg-white px-4 py-2 text-sm font-bold text-para-800 hover:bg-mint disabled:opacity-60">
        <FileArchive size={15} aria-hidden /> {pending ? "Import en cours…" : "Importer un fichier"}
      </button>
      {message && <span className="text-xs font-semibold text-para-700">{message}</span>}
      {error && <pre className="basis-full whitespace-pre-wrap rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{error}</pre>}
    </div>
  );
}
