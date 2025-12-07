/**
 * Convert an ImageBitmap to a Blob URL
 * @param bitmap The ImageBitmap to convert
 * @returns Promise resolving to a Blob URL string
 */
export async function imageBitmapToBlobUrl(
  bitmap: ImageBitmap,
): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get 2D context");

  ctx.drawImage(bitmap, 0, 0);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error("Failed to create blob"));
    });
  });

  return URL.createObjectURL(blob);
}
