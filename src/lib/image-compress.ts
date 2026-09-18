/**
 * Réduction des photos produit dans le navigateur, avant l'upload.
 *
 * Une photo de téléphone pèse souvent 2 à 5 Mo, alors qu'une Server Action
 * n'accepte qu'une taille de requête limitée (et Vercel plafonne à 4,5 Mo).
 * On redimensionne donc à `MAX_DIMENSION` px et on réencode en WebP, ce qui
 * ramène une photo sous ~1 Mo sans perte visible sur une fiche produit.
 *
 * Toujours sans risque : si le navigateur ne sait pas décoder le fichier ou si
 * le résultat n'est pas plus léger, le fichier d'origine est renvoyé tel quel
 * et la validation serveur reste seule juge.
 */

export const MAX_DIMENSION = 1600;
const QUALITY = 0.85;

/** Taille maximale envoyée au serveur, sous la limite des Server Actions. */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("decode"));
    };
    img.src = url;
  });
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

export async function compressProductImage(file: File): Promise<File> {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) return file;
  try {
    const img = await loadImage(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, width, height);

    // WebP conserve la transparence des PNG ; certains navigateurs anciens
    // renvoient du PNG à la place, d'où le contrôle du type obtenu.
    const blob = await toBlob(canvas, "image/webp", QUALITY);
    if (!blob || blob.type !== "image/webp" || blob.size >= file.size) return file;

    const base = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${base}.webp`, { type: "image/webp", lastModified: Date.now() });
  } catch {
    return file;
  }
}
