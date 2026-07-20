import { apiFetch } from "./client";

// Storage helpers. The download/delete endpoints take the R2 object key as a
// Base64 path param (the spec Base64-encodes the key so its "/" don't break the
// route). React Native/Hermes has no Buffer, so we Base64-encode manually over
// the key's bytes (R2 keys are ASCII paths like "avatar/user123/abc.jpg").
const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function base64(input: string): string {
  let out = "";
  let i = 0;
  while (i < input.length) {
    const c1 = input.charCodeAt(i++) & 0xff;
    const c2 = i < input.length ? input.charCodeAt(i++) & 0xff : NaN;
    const c3 = i < input.length ? input.charCodeAt(i++) & 0xff : NaN;
    const e1 = c1 >> 2;
    const e2 = ((c1 & 3) << 4) | (Number.isNaN(c2) ? 0 : c2 >> 4);
    const e3 = Number.isNaN(c2) ? 64 : ((c2 & 15) << 2) | (Number.isNaN(c3) ? 0 : c3 >> 6);
    const e4 = Number.isNaN(c3) ? 64 : c3 & 63;
    out += B64[e1] + B64[e2] + (e3 === 64 ? "=" : B64[e3]) + (e4 === 64 ? "=" : B64[e4]);
  }
  return out;
}

// encodeURIComponent keeps Base64's "/" "+" "=" safe inside the path segment.
function keyParam(key: string): string {
  return encodeURIComponent(base64(key));
}

export type StoragePurpose = "avatar" | "banner" | "gallery" | "document" | "chat";

export interface PresignUploadResult {
  uploadUrl: string;
  key: string;
}
export interface PresignDownloadResult {
  downloadUrl: string;
}
export interface DeleteFileResult {
  deleted?: boolean;
}

/**
 * POST /storage/presign/upload — request a signed R2 PUT URL. Params go on the
 * query string. Returns the URL to PUT the bytes to and the `key` to persist.
 * The device PUTs directly to R2 (our token never touches R2).
 */
export function presignUpload(
  type: StoragePurpose,
  mimeType: string,
  filename: string,
): Promise<PresignUploadResult> {
  const qs = new URLSearchParams({ type, mimeType, filename });
  return apiFetch<PresignUploadResult>(`/storage/presign/upload?${qs.toString()}`, {
    method: "POST",
  });
}

/** GET /storage/presign/download/{key} — short-lived (1h) signed URL to read an object. */
export function presignDownload(key: string): Promise<PresignDownloadResult> {
  return apiFetch<PresignDownloadResult>(`/storage/presign/download/${keyParam(key)}`);
}

/** DELETE /storage/{key} — remove a stored R2 object by its key. Authed via the API client. */
export function deleteFile(key: string): Promise<DeleteFileResult> {
  return apiFetch<DeleteFileResult>(`/storage/${keyParam(key)}`, { method: "DELETE" });
}
