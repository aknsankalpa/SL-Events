/**
 * Reads an image file and returns a downscaled data URL (JPEG by default, max 1400px wide). Use "image/png" for logos
 * so transparency is kept. Small enough to keep in
 * localStorage and to show inside the preview frame, unlike a blob: URL which dies on reload.
 */
export async function fileToCoverDataUrl(
  file: File,
  maxWidth = 1400,
  quality = 0.82,
  type: "image/jpeg" | "image/png" = "image/jpeg",
): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxWidth / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL(type, quality);
}
