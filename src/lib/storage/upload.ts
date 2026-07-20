import { presignUpload, type StoragePurpose } from "../api/storage";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // ~5MB

export interface PickedImage {
  uri: string;
  mimeType: string;
  fileName: string;
  fileSize?: number;
}

/** Client-side validation before we spend a presign + upload round-trip. */
export function validateImage(img: PickedImage): string | null {
  if (!img.mimeType.startsWith("image/")) return "Please choose an image file.";
  if (img.fileSize && img.fileSize > MAX_IMAGE_BYTES) return "Image must be under 5MB.";
  return null;
}

/**
 * Upload a picked image straight to R2 via a presigned PUT and return the stored
 * `key`. The PUT is a plain fetch to R2 — our API token is NEVER sent to R2.
 * Persisting the key on a resource is the caller's job.
 */
export async function uploadImageToR2(img: PickedImage, purpose: StoragePurpose): Promise<string> {
  const { uploadUrl, key } = await presignUpload(purpose, img.mimeType, img.fileName);

  const fileRes = await fetch(img.uri);
  const blob = await fileRes.blob();
  const put = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": img.mimeType },
    body: blob,
  });
  if (!put.ok) {
    throw new Error(`Upload failed (${put.status})`);
  }
  return key;
}
