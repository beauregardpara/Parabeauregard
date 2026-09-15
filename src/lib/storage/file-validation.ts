export const MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024;

const UPLOAD_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

export function hasValidImageSignature(bytes: Uint8Array, contentType: string) {
  if (contentType === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (contentType === "image/png") return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) => bytes[index] === value);
  return bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
}

export function validateProductImage(input: { size: number; type: string; bytes: Uint8Array }) {
  if (input.size === 0 || input.size > MAX_PRODUCT_IMAGE_BYTES) return { ok: false as const, error: "L’image doit peser entre 1 octet et 5 Mo." };
  const extension = UPLOAD_TYPES.get(input.type);
  if (!extension) return { ok: false as const, error: "Format accepté : JPEG, PNG ou WEBP." };
  if (!hasValidImageSignature(input.bytes, input.type)) return { ok: false as const, error: "Le fichier image est illisible ou son format ne correspond pas à son type." };
  return { ok: true as const, extension };
}
