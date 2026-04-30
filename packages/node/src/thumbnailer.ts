import path from "node:path";
import type { ManifestData } from "@pixzle/core";
import { generateThumbnailFileName } from "@pixzle/core";
import { createDir, loadBuffer, writeFile } from "./file";
import { resizePngInsideSquare } from "./image-codec";

export async function writeThumbnails(options: {
  images: string[];
  outputDir: string;
  manifest: ManifestData;
  size: number;
}): Promise<void> {
  const thumbnailOutputDir = path.join(options.outputDir, "thumbnails");
  await createDir(thumbnailOutputDir, true);

  await Promise.all(
    options.images.map(async (image, i) => {
      const thumbnail = await resizePngInsideSquare(
        await loadBuffer(image),
        options.size,
      );
      return writeFile(
        thumbnailOutputDir,
        generateThumbnailFileName(options.manifest, i),
        thumbnail,
      );
    }),
  );
}
