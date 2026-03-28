import { blocksToImageBuffer, splitImageToBlocks } from "./block-operations";
import { createPermutation } from "./block-permutation";
import {
  RGBA_CHANNELS,
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
    const blocks = splitImageToBlocks(
      image.buffer,
      image.width,
      image.height,
      config.blockSize,
    );
    const permutation = createPermutation(blocks.length, config.seed);
    const shuffledBlocks = permutation.map((index) => blocks[index]);
    const { width, height } = calculateFragmentLayout(
      shuffledBlocks.length,
      config.blockSize,
    );

    return {
      buffer: blocksToImageBuffer(
        shuffledBlocks,
        width,
        height,
        config.blockSize,
      ),
      width,
      height,
    };
  });
}

function fragmentAcrossImages(
  images: ImageBufferData[],
  config: FragmentBufferConfig,
): ImageBufferData[] {
  const allBlocks = images.flatMap((image) =>
    splitImageToBlocks(
      image.buffer,
      image.width,
      image.height,
      config.blockSize,
    ),
  );
  const permutation = createPermutation(allBlocks.length, config.seed);
  const shuffledBlocks = permutation.map((index) => allBlocks[index]);
  const fragmentBlockCounts = calculateBlockCountsForCrossImages(
    shuffledBlocks.length,
    images.length,
  );

  let offset = 0;

  return fragmentBlockCounts.map((blockCount) => {
    const fragmentBlocks = shuffledBlocks.slice(offset, offset + blockCount);
    offset += blockCount;

    const { width, height } = calculateFragmentLayout(
      fragmentBlocks.length,
      config.blockSize,
    );

    const buffer =
      width === 0 || height === 0
        ? new Uint8Array(0 * RGBA_CHANNELS)
        : blocksToImageBuffer(fragmentBlocks, width, height, config.blockSize);

    return { buffer, width, height };
  });
}
