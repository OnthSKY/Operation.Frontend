import { MAX_IMAGE_UPLOAD_BYTES } from "@/shared/lib/image-upload-limits";

/** İstemci tarafı: sunucudaki magic-number kontrolüyle uyumlu (JPEG/PNG/WebP/HEIC/AVIF). */
export type ImageUploadValidationError = "size" | "signature" | "mime";

const ALLOWED_DECLARED_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/pjpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/avif",
]);

function detectImageKind(head: Uint8Array): "jpeg" | "png" | "webp" | "heic" | "avif" | null {
  if (head.length < 12) return null;
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return "jpeg";
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (head.length >= 8 && png.every((b, i) => head[i] === b)) return "png";
  if (
    head[0] === 0x52 &&
    head[1] === 0x49 &&
    head[2] === 0x46 &&
    head[3] === 0x46 &&
    head[8] === 0x57 &&
    head[9] === 0x45 &&
    head[10] === 0x42 &&
    head[11] === 0x50
  ) {
    return "webp";
  }
  if (head[4] === 0x66 && head[5] === 0x74 && head[6] === 0x79 && head[7] === 0x70) {
    const brand = String.fromCharCode(head[8], head[9], head[10], head[11]);
    if (brand === "avif") return "avif";
    if (
      brand === "heic" ||
      brand === "heix" ||
      brand === "hevx" ||
      brand === "heim" ||
      brand === "heis" ||
      brand === "mif1" ||
      brand === "msf1"
    ) {
      return "heic";
    }
  }
  return null;
}

function declaredMimeCompatible(
  kind: "jpeg" | "png" | "webp" | "heic" | "avif",
  declaredRaw: string
): boolean {
  const m = declaredRaw.split(";")[0].trim().toLowerCase();
  if (m === "" || m === "application/octet-stream") return true;
  if (!ALLOWED_DECLARED_MIME.has(m)) return false;
  switch (kind) {
    case "jpeg":
      return m === "image/jpeg" || m === "image/jpg" || m === "image/pjpeg";
    case "png":
      return m === "image/png";
    case "webp":
      return m === "image/webp";
    case "heic":
      return m === "image/heic" || m === "image/heif";
    case "avif":
      return m === "image/avif";
    default:
      return false;
  }
}

export type ValidateImageFileResult =
  | { ok: true }
  | { ok: false; reason: ImageUploadValidationError };

/**
 * Dosya başlığı (magic) ve isteğe bağlı MIME ile doğrular.
 * PDF / SVG / yanlış etiketli dosyalar reddedilir.
 */
export async function validateImageFileForUpload(file: File): Promise<ValidateImageFileResult> {
  if (file.size > MAX_IMAGE_UPLOAD_BYTES) return { ok: false, reason: "size" };
  if (file.size < 12) return { ok: false, reason: "signature" };

  const buf = new Uint8Array(await file.slice(0, 32).arrayBuffer());
  const kind = detectImageKind(buf);
  if (!kind) return { ok: false, reason: "signature" };

  const declared = (file.type ?? "").trim();
  if (declared) {
    const base = declared.split(";")[0].trim().toLowerCase();
    if (base !== "application/octet-stream" && !ALLOWED_DECLARED_MIME.has(base)) {
      return { ok: false, reason: "mime" };
    }
    if (!declaredMimeCompatible(kind, declared)) {
      return { ok: false, reason: "mime" };
    }
  }

  return { ok: true };
}
