import { describe, expect, it } from "vitest";
import { validateProductImage } from "@/lib/storage/file-validation";

const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0x00]);
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);

describe("product image validation", () => {
  it("accepts the three supported signatures", () => {
    expect(validateProductImage({ size: jpeg.length, type: "image/jpeg", bytes: jpeg }).ok).toBe(true);
    expect(validateProductImage({ size: png.length, type: "image/png", bytes: png }).ok).toBe(true);
    expect(validateProductImage({ size: webp.length, type: "image/webp", bytes: webp }).ok).toBe(true);
  });

  it("rejects spoofed content and unsupported MIME types", () => {
    expect(validateProductImage({ size: jpeg.length, type: "image/png", bytes: jpeg }).ok).toBe(false);
    expect(validateProductImage({ size: jpeg.length, type: "application/pdf", bytes: jpeg }).ok).toBe(false);
  });

  it("rejects empty and oversized files", () => {
    expect(validateProductImage({ size: 0, type: "image/jpeg", bytes: new Uint8Array() }).ok).toBe(false);
    expect(validateProductImage({ size: 5 * 1024 * 1024 + 1, type: "image/jpeg", bytes: jpeg }).ok).toBe(false);
  });
});
