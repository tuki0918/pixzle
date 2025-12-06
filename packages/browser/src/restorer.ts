import { type ImageInfo, extractBlocks } from "@pixzle/core";
import { unshuffle } from "@tuki0918/seeded-shuffle";
import { blocksToImageBitmap, splitImageToBlocks } from "./block";

export class ImageRestorer {
  /**
   * Restore a single image from a shuffled source
   * @param imageSource The shuffled image (URL, Blob, HTMLImageElement, or ImageBitmap)
   * @param blockSize The block size used for fragmentation
   * @param seed The seed used for shuffling
   * @param imageInfo Information about the original image (dimensions)
   * @returns Promise resolving to the restored ImageBitmap
   */
  async restoreImage(
    imageSource: string | URL | Blob | HTMLImageElement | ImageBitmap,
    blockSize: number,
    seed: number | string,
    imageInfo: ImageInfo,
  ): Promise<ImageBitmap> {
    const image = await this._loadImage(imageSource);

    // Split the fragment image into blocks and take only the expected number
    // The fragment image may have extra padding blocks due to its square-ish layout
    const allBlocks = splitImageToBlocks(image, blockSize);
    const blocks = extractBlocks(
      allBlocks,
      imageInfo.w,
      imageInfo.h,
      blockSize,
    );

    const restoredBlocks = unshuffle(blocks, seed) as Uint8Array[];

    return blocksToImageBitmap(
      restoredBlocks,
      imageInfo.w,
      imageInfo.h,
      blockSize,
    );
  }

  private async _loadImage(
    sourceInput: string | URL | Blob | HTMLImageElement | ImageBitmap,
  ): Promise<HTMLImageElement | ImageBitmap> {
    let source = sourceInput;
    if (typeof URL !== "undefined" && source instanceof URL) {
      source = source.toString();
    }

    if (
      typeof HTMLImageElement !== "undefined" &&
      source instanceof HTMLImageElement
    ) {
      if (source.complete) return source;
      await new Promise((resolve, reject) => {
        source.onload = resolve;
        source.onerror = reject;
      });
      return source;
    }

    if (typeof ImageBitmap !== "undefined" && source instanceof ImageBitmap) {
      return source;
    }

    if (typeof Blob !== "undefined" && source instanceof Blob) {
      return createImageBitmap(source);
    }

    if (typeof source === "string") {
      const response = await fetch(source);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch image: ${response.status} ${response.statusText}`,
        );
      }
      const blob = await response.blob();
      return createImageBitmap(blob);
    }

    throw new Error("Unsupported image source");
  }
}
