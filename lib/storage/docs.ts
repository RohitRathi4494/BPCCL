/**
 * Shared (client + server safe) constants + validation for PRIVATE document
 * uploads (Aadhaar + payment screenshot). No server-only imports here so the
 * registration form (client) and the presign server action (server) agree on
 * the rules.
 *
 * Private docs live in the private R2 bucket and are referenced in the DB by
 * object KEY only — never a URL. Keys are always `docs/{kind}/{uuid}.{ext}`.
 */

export type DocKind = "aadhaar" | "payment";
export const DOC_KINDS: readonly DocKind[] = ["aadhaar", "payment"];

/** Image types accepted for a private doc (compressed in-browser before upload). */
export const DOC_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
/** HEIC is accepted at the picker and converted to WebP in-browser when possible. */
export const DOC_HEIC_TYPES = ["image/heic", "image/heif"] as const;
/** PDF is accepted for Aadhaar only, uploaded as-is (no compression). */
export const DOC_PDF_TYPE = "application/pdf";

/** Reject anything larger than this BEFORE compressing. */
export const MAX_RAW_DOC_BYTES = 5 * 1024 * 1024; // 5 MB
/** A PDF is uploaded uncompressed, so it has a tighter hard cap. */
export const MAX_PDF_BYTES = 1 * 1024 * 1024; // 1 MB
/** Safety cap for the compressed image the server will accept. */
export const MAX_COMPRESSED_DOC_BYTES = 600 * 1024; // ~600 KB

/** Doc image compression target: readable text, ~200–300 KB. */
export const DOC_IMAGE_MAX_EDGE = 1400;
export const DOC_IMAGE_TARGET_BYTES = 280_000;

/** Object key extension for a stored content type. */
export const DOC_EXT_BY_TYPE: Record<string, string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/png": "png",
  "application/pdf": "pdf",
};

/** The content types the server will actually STORE (post-compression). */
export function isStorableDocType(kind: DocKind, contentType: string): boolean {
  if ((DOC_IMAGE_TYPES as readonly string[]).includes(contentType)) return true;
  // PDF is only valid for Aadhaar.
  if (kind === "aadhaar" && contentType === DOC_PDF_TYPE) return true;
  return false;
}

/** The content types the browser file picker will accept for a given doc kind. */
export function acceptAttr(kind: DocKind): string {
  const types: string[] = [...DOC_IMAGE_TYPES, ...DOC_HEIC_TYPES];
  if (kind === "aadhaar") types.push(DOC_PDF_TYPE);
  return types.join(",");
}

export function isValidDocKind(v: unknown): v is DocKind {
  return typeof v === "string" && (DOC_KINDS as readonly string[]).includes(v);
}
