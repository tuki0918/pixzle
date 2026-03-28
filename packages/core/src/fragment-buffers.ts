import { copyBlockFromImageBuffer } from "./block-operations";
import {
  buildCumulativeCounts,
  createPermutation,
  findIndexInCumulative,
} from "./block-permutation";
import {
  RGBA_CHANNELS,
  calculateBlockCounts,
  calculateBlockCountsForCrossImages,
} from "./block-utils";
import type { FragmentationConfig, ImageBufferData } from "./types";

type FragmentBufferConfig = Pick<
  Required<FragmentationConfig>,
  "blockSize" | "seed" | "crossImageShuffle"
>;

export function fragmentImageBuffers(
  images: ImageBufferData[],
  config: FragmentBufferConfig,
): ImageBufferData[] {
  if (config.crossImageShuffle) {
    return fragmentAcrossImages(images, config);
  }

  return fragmentEachImage(images, config);
}

export function calculateFragmentLayout(
  blockCount: number,
  blockSize: number,
): {
  blocksPerRow: number;
  width: number;
  height: number;
} {
  if (blockCount <= 0 || blockSize <= 0) {
    return { blocksPerRow: 0, width: 0, height: 0 };
  }

  const blocksPerRow = Math.ceil(Math.sqrt(blockCount));
  const width = blocksPerRow * blockSize;
  const height = Math.ceil(blockCount / blocksPerRow) * blockSize;

  return { blocksPerRow, width, height };
}

function fragmentEachImage(
  images: ImageBufferData[],
  config: FragmentBufferConfig,
): ImageBufferData[] {
  return images.map((image) => {
    const { blockCountX, blockCountY } = calculateBlockCounts(
      image.width,
      image.height,
      config.blockSize,
    );
    const blockCount = blockCountX * blockCountY;
    const permutation = createPermutation(blockCount, config.seed);
    const { width, height } = calculateFragmentLayout(
      blockCount,
      config.blockSize,
    );
    const buffer = new Uint8Array(width * height * RGBA_CHANNELS);

    for (
      let targetBlockIndex = 0;
      targetBlockIndex < blockCount;
      targetBlockIndex++
    ) {
      copyBlockFromImageBuffer(
        image.buffer,
        image.width,
        image.height,
        config.blockSize,
        permutation[targetBlockIndex],
        buffer,
        width,
        height,
        targetBlockIndex,
        Math.ceil(width / config.blockSize),
      );
    }

    return {
      buffer,
      width,
      height,
    };
  });
}

function fragmentAcrossImages(
  images: ImageBufferData[],
  config: FragmentBufferConfig,
): ImageBufferData[] {
  const sourceCounts = images.map((image) => {
    const { blockCountX, blockCountY } = calculateBlockCounts(
      image.width,
      image.height,
      config.blockSize,
    );
    return blockCountX * blockCountY;
  });
  const totalBlocks = sourceCounts.reduce(
    (sum, blockCount) => sum + blockCount,
    0,
  );
  const sourceEnds = buildCumulativeCounts(sourceCounts);
  const permutation = createPermutation(totalBlocks, config.seed);
  const fragmentBlockCounts = calculateBlockCountsForCrossImages(
    totalBlocks,
    images.length,
  );

  let offset = 0;

  return fragmentBlockCounts.map((blockCount) => {
    const { width, height } = calculateFragmentLayout(
      blockCount,
      config.blockSize,
    );
    const buffer = new Uint8Array(width * height * RGBA_CHANNELS);
    const blocksPerRow = Math.ceil(width / config.blockSize);

    for (
      let localBlockIndex = 0;
      localBlockIndex < blockCount;
      localBlockIndex++
    ) {
      const globalIndex = offset + localBlockIndex;
      const sourceGlobalIndex = permutation[globalIndex];
      const { rangeIndex, localIndex: sourceBlockIndex } =
        findIndexInCumulative(sourceEnds, sourceCounts, sourceGlobalIndex);
      const source = images[rangeIndex];

      copyBlockFromImageBuffer(
        source.buffer,
        source.width,
        source.height,
        config.blockSize,
        sourceBlockIndex,
        buffer,
        width,
        height,
        localBlockIndex,
        blocksPerRow,
      );
    }

    offset += blockCount;

    return { buffer, width, height };
  });
}
