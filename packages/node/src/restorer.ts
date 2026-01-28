import {
  type ManifestData,
  RGBA_CHANNELS,
  calculateBlockCounts,
  calculateBlockCountsForCrossImages,
  calculateBlockCountsPerImage,
  calculateTotalBlocks,
  validateFragmentImageCount,
} from "@pixzle/core";
import {
  copyBlockFromImageBuffer,
  createPngFromImageBuffer,
  loadImageBuffer,
} from "./block";
import {
  buildCumulativeCounts,
  createPermutation,
  findIndexInCumulative,
  invertPermutation,
} from "./block-permutation";
import { loadBuffer } from "./file";

interface FragmentImageData {
  buffer: Buffer;
  width: number;
  height: number;
}

export class ImageRestorer {
  async restoreImages(
    fragments: (string | Buffer)[],
    manifest: ManifestData,
  ): Promise<Buffer[]> {
    validateFragmentImageCount(fragments, manifest);
    if (manifest.config.crossImageShuffle) {
      return await this._restoreCrossImage(fragments, manifest);
    }
    return await this._restorePerImage(fragments, manifest);
  }

  private async _restorePerImage(
    fragments: (string | Buffer)[],
    manifest: ManifestData,
  ): Promise<Buffer[]> {
    const blockCountsPerImage = calculateBlockCountsPerImage(
      manifest.images,
      manifest.config.blockSize,
    );
    const restoredImages: Buffer[] = [];

    for (let i = 0; i < fragments.length; i++) {
      const fragment = await this._loadFragment(fragments[i]);
      const imageInfo = manifest.images[i];
      const blockCount = blockCountsPerImage[i];

      const permutation = createPermutation(blockCount, manifest.config.seed);
      const inverse = invertPermutation(permutation);

      const outputBuffer = Buffer.alloc(
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
        await createPngFromImageBuffer(outputBuffer, imageInfo.w, imageInfo.h),
      );
    }

    return restoredImages;
  }

  private async _restoreCrossImage(
    fragments: (string | Buffer)[],
    manifest: ManifestData,
  ): Promise<Buffer[]> {
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
      fragments.map((fragment) => this._loadFragment(fragment)),
    );

    const fragmentEnds = buildCumulativeCounts(blockCountsForCrossImages);
    const imageEnds = buildCumulativeCounts(blockCountsPerImage);

    const permutation = createPermutation(totalBlocks, manifest.config.seed);
    const inverse = invertPermutation(permutation);

    const restoredImages: Buffer[] = [];

    for (
      let imageIndex = 0;
      imageIndex < manifest.images.length;
      imageIndex++
    ) {
      const imageInfo = manifest.images[imageIndex];
      const blockCount = blockCountsPerImage[imageIndex];
      const imageStart = imageEnds[imageIndex] - blockCount;

      const outputBuffer = Buffer.alloc(
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
        const fragment = fragmentImages[rangeIndex];

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
        await createPngFromImageBuffer(outputBuffer, imageInfo.w, imageInfo.h),
      );
    }

    return restoredImages;
  }

  private async _loadFragment(
    fragment: string | Buffer,
  ): Promise<FragmentImageData> {
    const buffer = Buffer.isBuffer(fragment)
      ? fragment
      : await loadBuffer(fragment);
    const { imageBuffer, width, height } = await loadImageBuffer(buffer);
    return { buffer: imageBuffer, width, height };
  }
}
