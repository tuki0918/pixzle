import {
  type ImageInfo,
  type ManifestData,
  calculateBlockCountsForCrossImages,
  calculateBlockCountsPerImage,
  calculateBlockRange,
  calculateTotalBlocks,
  createSingleImageManifest,
  takeBlocks,
} from "@pixzle/core";
import { unshuffle } from "@tuki0918/seeded-shuffle";
import {
  blocksPerImage,
  blocksToImageBitmap,
  splitImageToBlocks,
} from "./block";

export type ImageSource = string | URL | Blob | HTMLImageElement | ImageBitmap;

export class ImageRestorer {
  /**
   * Restore multiple images from shuffled fragments
   * @param fragments Array of fragment sources (URLs, Blobs, HTMLImageElements, or ImageBitmaps)
   * @param manifest The manifest data containing restoration information
   * @returns Promise resolving to an array of restored ImageBitmaps
   */
  async restoreImages(
    fragments: ImageSource[],
    manifest: ManifestData,
    fetchOptions?: RequestInit,
  ): Promise<ImageBitmap[]> {
    const { blocks, blockCountsPerImage } = await this._prepareData(
      fragments,
      manifest,
      fetchOptions,
    );

    const restored = manifest.config.crossImageShuffle
      ? unshuffle(blocks, manifest.config.seed)
      : blocksPerImage(
          blocks,
          blockCountsPerImage,
          manifest.config.seed,
          unshuffle,
        );

    return await this._reconstructImages(restored, manifest);
  }

  /**
   * Restore a single image from a shuffled source
   * @param imageSource The shuffled image (URL, Blob, HTMLImageElement, or ImageBitmap)
   * @param blockSize The block size used for fragmentation
   * @param seed The seed used for shuffling
   * @param imageInfo Information about the original image (dimensions)
   * @returns Promise resolving to the restored ImageBitmap
   */
  async restoreImage(
    imageSource: ImageSource,
    blockSize: number,
    seed: number,
    imageInfo: ImageInfo,
    fetchOptions?: RequestInit,
  ): Promise<ImageBitmap> {
    const manifest = createSingleImageManifest({ blockSize, seed, imageInfo });

    const [restoredImage] = await this.restoreImages(
      [imageSource],
      manifest,
      fetchOptions,
    );
    return restoredImage;
  }

  private async _loadImage(
    sourceInput: string | URL | Blob | HTMLImageElement | ImageBitmap,
    fetchOptions?: RequestInit,
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
      const response = await fetch(source, fetchOptions);
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

  private async _prepareData(
    fragments: ImageSource[],
    manifest: ManifestData,
    fetchOptions?: RequestInit,
  ): Promise<{
    blocks: Uint8Array[];
    blockCountsPerImage: number[];
  }> {
    const totalBlocks = calculateTotalBlocks(
      manifest.images,
      manifest.config.blockSize,
    );
    const blockCountsForCrossImages = calculateBlockCountsForCrossImages(
      totalBlocks,
      fragments.length,
    );

    // Calculate actual block counts per image for per-image unshuffle
    const blockCountsPerImage = calculateBlockCountsPerImage(
      manifest.images,
      manifest.config.blockSize,
    );

    // Use blockCountsPerImage when crossImageShuffle is false
    const blockCounts = manifest.config.crossImageShuffle
      ? blockCountsForCrossImages
      : blockCountsPerImage;

    const blocks = await this._readBlocks(
      fragments,
      manifest,
      blockCounts,
      fetchOptions,
    );

    return { blocks, blockCountsPerImage };
  }

  private async _readBlocksFromFragment(
    fragment: ImageSource,
    manifest: ManifestData,
    expectedCount: number,
    fetchOptions?: RequestInit,
  ): Promise<Uint8Array[]> {
    const image = await this._loadImage(fragment, fetchOptions);
    const blocks = splitImageToBlocks(image, manifest.config.blockSize);
    return takeBlocks(blocks, expectedCount);
  }

  private async _readBlocks(
    fragments: ImageSource[],
    manifest: ManifestData,
    blockCounts: number[],
    fetchOptions?: RequestInit,
  ): Promise<Uint8Array[]> {
    const blockGroups = await Promise.all(
      fragments.map((fragment, i) =>
        this._readBlocksFromFragment(
          fragment,
          manifest,
          blockCounts[i],
          fetchOptions,
        ),
      ),
    );
    return blockGroups.flat();
  }

  private async _reconstructImages(
    blocks: Uint8Array[],
    manifest: ManifestData,
  ): Promise<ImageBitmap[]> {
    const blockCountsPerImage = calculateBlockCountsPerImage(
      manifest.images,
      manifest.config.blockSize,
    );
    return await Promise.all(
      manifest.images.map(async (imageInfo, index) => {
        const { start, end } = calculateBlockRange(blockCountsPerImage, index);
        const imageBlocks = blocks.slice(start, end);
        return await blocksToImageBitmap(
          imageBlocks,
          imageInfo.w,
          imageInfo.h,
          manifest.config.blockSize,
        );
      }),
    );
  }
}
