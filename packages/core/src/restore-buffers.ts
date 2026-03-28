import { copyBlockFromImageBuffer } from "./block-operations";
import {
  buildCumulativeCounts,
  createPermutation,
  findIndexInCumulative,
  invertPermutation,
} from "./block-permutation";
import {
  RGBA_CHANNELS,
  calculateBlockCounts,
  calculateBlockCountsForCrossImages,
  calculateBlockCountsPerImage,
  calculateTotalBlocks,
} from "./block-utils";
import type { ImageBufferData, ManifestData } from "./types";
import { validateFragmentImageCount } from "./validators";

export function restoreImageBuffers(
  fragments: ImageBufferData[],
  manifest: ManifestData,
): Uint8Array[] {
  validateFragmentImageCount(fragments, manifest);

  if (manifest.config.crossImageShuffle) {
    return restoreAcrossImages(fragments, manifest);
  }

  return restoreEachImage(fragments, manifest);
}

function restoreEachImage(
  fragments: ImageBufferData[],
  manifest: ManifestData,
): Uint8Array[] {
  const blockCountsPerImage = calculateBlockCountsPerImage(
    manifest.images,
    manifest.config.blockSize,
  );

  return manifest.images.map((imageInfo, imageIndex) => {
    const fragment = fragments[imageIndex];
    const blockCount = blockCountsPerImage[imageIndex];
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
      copyBlockFromImageBuffer(
        fragment.buffer,
        fragment.width,
        fragment.height,
        manifest.config.blockSize,
        inverse[blockIndex],
        outputBuffer,
        imageInfo.w,
        imageInfo.h,
        blockIndex,
        targetBlocksPerRow,
      );
    }

    return outputBuffer;
  });
}

function restoreAcrossImages(
  fragments: ImageBufferData[],
  manifest: ManifestData,
): Uint8Array[] {
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
  const fragmentEnds = buildCumulativeCounts(blockCountsForCrossImages);
  const imageEnds = buildCumulativeCounts(blockCountsPerImage);
  const permutation = createPermutation(totalBlocks, manifest.config.seed);
  const inverse = invertPermutation(permutation);

  return manifest.images.map((imageInfo, imageIndex) => {
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
      const sourceIndex = inverse[imageStart + localIndex];
      const { rangeIndex, localIndex: fragmentLocalIndex } =
        findIndexInCumulative(
          fragmentEnds,
          blockCountsForCrossImages,
          sourceIndex,
        );
      const fragment = fragments[rangeIndex];

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

    return outputBuffer;
  });
}
