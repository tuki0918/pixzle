import {
  type ImageBufferData,
  type ManifestData,
  restoreImageBuffers,
  validateFragmentImageCount,
} from "@pixzle/core";
import { loadBuffer } from "./file";
import { createPngFromImageBuffer, loadImageBuffer } from "./image-buffer";

export class ImageRestorer {
  async restoreImages(
    fragments: (string | Buffer)[],
    manifest: ManifestData,
  ): Promise<Buffer[]> {
    validateFragmentImageCount(fragments, manifest);

    const fragmentImages = await Promise.all(
      fragments.map((fragment) => this.loadFragment(fragment)),
    );
    const restoredBuffers = restoreImageBuffers(fragmentImages, manifest);

    return await Promise.all(
      restoredBuffers.map((buffer, index) =>
        createPngFromImageBuffer(
          Buffer.from(buffer),
          manifest.images[index].w,
          manifest.images[index].h,
        ),
      ),
    );
  }

  private async loadFragment(
    fragment: string | Buffer,
  ): Promise<ImageBufferData> {
    const buffer = Buffer.isBuffer(fragment)
      ? fragment
      : await loadBuffer(fragment);
    const { imageBuffer, width, height } = await loadImageBuffer(buffer);
    return { buffer: imageBuffer, width, height };
  }
}
