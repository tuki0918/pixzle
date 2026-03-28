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
import type {
  FragmentationConfig,
  ImageBufferData,
  ImageInfo,
  ManifestData,
} from "./types";
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

export function restoreSingleImageBuffer(
  fragment: ImageBufferData,
  config: Pick<Required<FragmentationConfig>, "blockSize" | "seed">,
  imageInfo: ImageInfo,
): Uint8Array {
  const { blockCountX, blockCountY } = calculateBlockCounts(
    imageInfo.w,
    imageInfo.h,
    config.blockSize,
  );
  const blockCount = blockCountX * blockCountY;
  const permutation = createPermutation(blockCount, config.seed);
  const inverse = invertPermutation(permutation);
  const outputBuffer = new Uint8Array(
    imageInfo.w * imageInfo.h * RGBA_CHANNELS,
  );

  for (let blockIndex = 0; blockIndex < blockCount; blockIndex++) {
    copyBlockFromImageBuffer(
      fragment.buffer,
      fragment.width,
      fragment.height,
      config.blockSize,
      inverse[blockIndex],
      outputBuffer,
      imageInfo.w,
      imageInfo.h,
      blockIndex,
      blockCountX,
    );
  }

  return outputBuffer;
}

function restoreEachImage(
  fragments: ImageBufferData[],
  manifest: ManifestData,
): Uint8Array[] {
  return manifest.images.map((imageInfo, imageIndex) =>
    restoreSingleImageBuffer(fragments[imageIndex], manifest.config, imageInfo),
  );
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
