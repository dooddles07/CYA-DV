const MAX_EDGE = 1600;
const MAX_BYTES = 2 * 1024 * 1024;

/**
 * Shrinks a photo in the browser before upload: caps the long edge and steps
 * quality down until it fits. Phone camera shots and pubmat exports are often
 * 5-10MB, which the server would reject outright.
 *
 * PNGs are re-encoded as JPEG unless transparency matters, since pubmats are
 * usually photographic and JPEG is far smaller.
 */
export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  // Already small enough and no resize needed — leave it alone.
  if (scale === 1 && file.size <= MAX_BYTES && file.type === "image/jpeg") {
    bitmap.close();
    return file;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  // White matte so transparent PNGs don't turn black once encoded as JPEG.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  for (const quality of [0.85, 0.75, 0.65, 0.55]) {
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality)
    );
    if (blob && blob.size <= MAX_BYTES) {
      const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
      return new File([blob], name, { type: "image/jpeg" });
    }
  }

  return file;
}
