import type { ImageInfo } from "./types";

/**
 * Number of channels in RGBA format
 */
export const RGBA_CHANNELS = 4;

export interface BlockCounts {
  blockCountX: number;
  blockCountY: number;
}

/**
 * Calculate block counts for width and height
 * @param width Image width
 * @param height Image height
 * @param blockSize Block size
 * @returns Object with blockCountX and blockCountY
 */
export function calculateBlockCounts(
  width: number,
  height: number,
  blockSize: number,
): BlockCounts {
  return {
    blockCountX: Math.ceil(width / blockSize),
    blockCountY: Math.ceil(height / blockSize),
  };
}

/**
 * Calculate the range of blocks for a specific image index
 * @param blockCounts Array of block counts per image
 * @param targetIndex Target image index
 * @returns Object with start and end indices
 */
export function calculateBlockRange(
  blockCounts: number[],
  targetIndex: number,
): { start: number; end: number } {
  const start = blockCounts
    .slice(0, targetIndex)
    .reduce((sum, count) => sum + count, 0);
  const end = start + blockCounts[targetIndex];

  return { start, end };
}

/**
 * Calculate how many blocks each fragment should contain for cross-image shuffling
 * @param totalBlocks Total number of blocks to distribute
 * @param fragmentCount Number of fragments to create
 * @returns Array of block counts for each fragment
 */
export function calculateBlockCountsForCrossImages(
  totalBlocks: number,
  fragmentCount: number,
): number[] {
  if (fragmentCount <= 0) {
    throw new Error("Fragment count must be greater than 0");
  }

  if (totalBlocks <= 0) {
    return new Array(fragmentCount).fill(0);
  }

  const baseBlocksPerFragment = Math.ceil(totalBlocks / fragmentCount);
  const fragmentBlockCounts: number[] = [];
  let remainingBlocks = totalBlocks;

  // Distribute blocks, ensuring no fragment gets more blocks than available
  for (let i = 0; i < fragmentCount; i++) {
    const blocksForThisFragment = Math.min(
      baseBlocksPerFragment,
      remainingBlocks,
    );
    fragmentBlockCounts.push(blocksForThisFragment);
    remainingBlocks -= blocksForThisFragment;

    // If no blocks remain, fill remaining fragments with 0
    if (remainingBlocks <= 0) {
      for (let j = i + 1; j < fragmentCount; j++) {
        fragmentBlockCounts.push(0);
      }
      break;
    }
  }

  return fragmentBlockCounts;
}

/**
 * Calculate block count for a single image
 * @param width Image width
 * @param height Image height
 * @param blockSize Block size
 * @returns Total block count (blockCountX * blockCountY)
 */
export function calculateBlockCount(
  width: number,
  height: number,
  blockSize: number,
): number {
  const { blockCountX, blockCountY } = calculateBlockCounts(
    width,
    height,
    blockSize,
  );
  return blockCountX * blockCountY;
}

/**
 * Calculate block counts for each image
 * @param images Array of ImageInfo objects
 * @param blockSize Block size
 * @returns Array of block counts per image (x * y)
 */
export function calculateBlockCountsPerImage(
  images: ImageInfo[],
  blockSize: number,
): number[] {
  return images.map((info) => calculateBlockCount(info.w, info.h, blockSize));
}

/**
 * Calculate total number of blocks from images
 * @param images Array of ImageInfo objects
 * @param blockSize Block size
 * @returns Total block count
 */
export function calculateTotalBlocks(
  images: ImageInfo[],
  blockSize: number,
): number {
  return images.reduce(
    (total, image) => total + calculateBlockCount(image.w, image.h, blockSize),
    0,
  );
}

/**
 * Take the first n blocks from an array of blocks
 * @param blocks Array of blocks
 * @param count Number of blocks to take
 * @returns Array of blocks with the specified count
 */
export function takeBlocks<T>(blocks: T[], count: number): T[] {
  return blocks.slice(0, count);
}

/**
 * Extract the required number of blocks from an array of blocks
 * This is useful when restoring images from fragment images that may have
 * extra padding blocks due to their square-ish layout
 * @param blocks Array of blocks from the fragment image
 * @param width Original image width
 * @param height Original image height
 * @param blockSize Block size
 * @returns Array of blocks with the expected count
 */
export function extractBlocks<T>(
  blocks: T[],
  width: number,
  height: number,
  blockSize: number,
): T[] {
  const expectedCount = calculateBlockCount(width, height, blockSize);
  return takeBlocks(blocks, expectedCount);
}
