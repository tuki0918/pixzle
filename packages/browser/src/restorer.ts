import {
  type ImageInfo,
  type ManifestData,
  RGBA_CHANNELS,
  buildCumulativeCounts,
  calculateBlockCounts,
  calculateBlockCountsForCrossImages,
  calculateBlockCountsPerImage,
  calculateTotalBlocks,
  createPermutation,
  createSingleImageManifest,
  findIndexInCumulative,
  invertPermutation,
} from "@pixzle/core";
import {
  copyBlockFromImageBuffer,
  imageBufferToImageBitmap,
  imageToImageBuffer,
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
    this._validateFragmentImageCount(fragments, manifest);
    if (manifest.config.crossImageShuffle) {
      return await this._restoreCrossImage(fragments, manifest, fetchOptions);
    }
    return await this._restorePerImage(fragments, manifest, fetchOptions);
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

  private async _restorePerImage(
    fragments: ImageSource[],
    manifest: ManifestData,
    fetchOptions?: RequestInit,
  ): Promise<ImageBitmap[]> {
    const blockCountsPerImage = calculateBlockCountsPerImage(
      manifest.images,
      manifest.config.blockSize,
    );

    const restoredImages: ImageBitmap[] = [];

    for (let i = 0; i < fragments.length; i++) {
      const image = await this._loadImage(fragments[i], fetchOptions);
      const fragment = imageToImageBuffer(image);
      const imageInfo = manifest.images[i];
      const blockCount = blockCountsPerImage[i];

      const permutation = createPermutation(blockCount, manifest.config.seed);
      const inverse = invertPermutation(permutation);

      const outputBuffer = new Uint8Array(
        imageInfo.w * imageInfo.h * RGBA_CHANNELS,
      );
      const targetBlocksPerRow = calculateBlockCounts(
        imageInfo.w,
        imageInfo.h,
        manifest.config.blockSize,
      ).blockCountX;

      for (let blockIndex = 0; blockIndex < blockCount; blockIndex++) {
        const sourceIndex = inverse[blockIndex];
        copyBlockFromImageBuffer(
          fragment.buffer,
          fragment.width,
          fragment.height,
          manifest.config.blockSize,
          sourceIndex,
          outputBuffer,
          imageInfo.w,
          imageInfo.h,
          blockIndex,
          targetBlocksPerRow,
        );
      }

      restoredImages.push(
        await imageBufferToImageBitmap(outputBuffer, imageInfo.w, imageInfo.h),
      );
    }

    return restoredImages;
  }

  private async _restoreCrossImage(
    fragments: ImageSource[],
    manifest: ManifestData,
    fetchOptions?: RequestInit,
  ): Promise<ImageBitmap[]> {
    const totalBlocks = calculateTotalBlocks(
      manifest.images,
      manifest.config.blockSize,
    );

    const blockCountsForCrossImages = calculateBlockCountsForCrossImages(
      totalBlocks,
      fragments.length,
    );

    const blockCountsPerImage = calculateBlockCountsPerImage(
      manifest.images,
      manifest.config.blockSize,
    );

    const fragmentImages = await Promise.all(
      fragments.map((fragment) => this._loadImage(fragment, fetchOptions)),
    );
    const fragmentBuffers = fragmentImages.map((image) =>
      imageToImageBuffer(image),
    );

    const fragmentEnds = buildCumulativeCounts(blockCountsForCrossImages);
    const imageEnds = buildCumulativeCounts(blockCountsPerImage);

    const permutation = createPermutation(totalBlocks, manifest.config.seed);
    const inverse = invertPermutation(permutation);

    const restoredImages: ImageBitmap[] = [];

    for (
      let imageIndex = 0;
      imageIndex < manifest.images.length;
      imageIndex++
    ) {
      const imageInfo = manifest.images[imageIndex];
      const blockCount = blockCountsPerImage[imageIndex];
      const imageStart = imageEnds[imageIndex] - blockCount;

      const outputBuffer = new Uint8Array(
        imageInfo.w * imageInfo.h * RGBA_CHANNELS,
      );
      const targetBlocksPerRow = calculateBlockCounts(
        imageInfo.w,
        imageInfo.h,
        manifest.config.blockSize,
      ).blockCountX;

      for (let localIndex = 0; localIndex < blockCount; localIndex++) {
        const globalIndex = imageStart + localIndex;
        const sourceIndex = inverse[globalIndex];
        const { rangeIndex, localIndex: fragmentLocalIndex } =
          findIndexInCumulative(
            fragmentEnds,
            blockCountsForCrossImages,
            sourceIndex,
          );
        const fragment = fragmentBuffers[rangeIndex];

        copyBlockFromImageBuffer(
          fragment.buffer,
          fragment.width,
          fragment.height,
          manifest.config.blockSize,
          fragmentLocalIndex,
          outputBuffer,
          imageInfo.w,
          imageInfo.h,
          localIndex,
          targetBlocksPerRow,
        );
      }

      restoredImages.push(
        await imageBufferToImageBitmap(outputBuffer, imageInfo.w, imageInfo.h),
      );
    }

    return restoredImages;
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

  private _validateFragmentImageCount(
    fragments: ImageSource[],
    manifest: ManifestData,
  ): void {
    const manifestImageCount = manifest.images.length;
    const fragmentImageCount = fragments.length;

    if (manifestImageCount !== fragmentImageCount) {
      throw new Error(
        `Fragment image count mismatch: expected ${manifestImageCount} but got ${fragmentImageCount}`,
      );
    }
  }
}
