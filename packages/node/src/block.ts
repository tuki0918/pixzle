import {
  RGBA_CHANNELS,
  calculateBlockCounts,
  blocksToImageBuffer as coreBlocksToImageBuffer,
  splitImageToBlocks as coreSplitImageToBlocks,
} from "@pixzle/core";
import { Jimp, JimpMime } from "jimp";

interface ImageToBlocksResult {
  blocks: Buffer[];
  width: number;
  height: number;
  channels: number;
  blockCountX: number;
  blockCountY: number;
}

interface ImageBufferResult {
  imageBuffer: Buffer;
  width: number;
  height: number;
}

/**
 * Format error message consistently
 * @param operation Description of the operation that failed
 * @param error The error that occurred
 * @returns Formatted error message
 */
function formatErrorMessage(operation: string, error: unknown): string {
  const errorMessage = error instanceof Error ? error.message : "Unknown error";
  return `${operation}: ${errorMessage}`;
}

/**
 * Create a Jimp image from raw RGBA image buffer
 * @param imageBuffer Raw RGBA image buffer
 * @param width Image width in pixels
 * @param height Image height in pixels
 * @returns Jimp image instance
 */
function createJimpFromImageBuffer(
  imageBuffer: Buffer,
  width: number,
  height: number,
): InstanceType<typeof Jimp> {
  return new Jimp({
    data: imageBuffer,
    width,
    height,
  });
}

/**
 * Split an RGBA image buffer into an array of blocks (Node.js Buffer wrapper)
 * @param buffer Source image buffer (RGBA format)
 * @param width Image width in pixels
 * @param height Image height in pixels
 * @param blockSize Block size in pixels
 * @returns Array of block buffers
 */
export function splitImageToBlocks(
  buffer: Buffer,
  width: number,
  height: number,
  blockSize: number,
): Buffer[] {
  const blocks = coreSplitImageToBlocks(buffer, width, height, blockSize);
  return blocks.map((block) => Buffer.from(block));
}

/**
 * Reconstruct an RGBA image buffer from an array of blocks (Node.js Buffer wrapper)
 * @param blocks Array of block buffers
 * @param width Target image width in pixels
 * @param height Target image height in pixels
 * @param blockSize Block size in pixels
 * @returns Reconstructed image buffer
 */
export function blocksToImageBuffer(
  blocks: Buffer[],
  width: number,
  height: number,
  blockSize: number,
): Buffer {
  const uint8Blocks = blocks.map((block) => new Uint8Array(block));
  const imageBuffer = coreBlocksToImageBuffer(
    uint8Blocks,
    width,
    height,
    blockSize,
  );
  return Buffer.from(imageBuffer);
}

/**
 * Load an image from file or buffer and split into blocks
 * @param input Path to the image file or Buffer containing image data
 * @param blockSize Block size in pixels
 * @returns Promise resolving to block data and image metadata
 */
export async function imageToBlocks(
  input: string | Buffer,
  blockSize: number,
): Promise<ImageToBlocksResult> {
  try {
    // Load and process image with Jimp (automatically converts to RGBA)
    const image = await Jimp.read(input);
    const { width, height } = image.bitmap;
    const channels = RGBA_CHANNELS;
    const imageBuffer = image.bitmap.data;

    // Split image into blocks
    const blocks = splitImageToBlocks(imageBuffer, width, height, blockSize);
    const blockCounts = calculateBlockCounts(width, height, blockSize);

    return {
      blocks,
      width,
      height,
      channels,
      blockCountX: blockCounts.blockCountX,
      blockCountY: blockCounts.blockCountY,
    };
  } catch (error) {
    throw new Error(
      `${formatErrorMessage("Failed to process image file", error)}. The manifest file may not match the image data.`,
    );
  }
}

/**
 * Load an image and return its raw RGBA buffer and dimensions
 * @param input Path to the image file or Buffer containing image data
 * @returns Promise resolving to image buffer and dimensions
 */
export async function loadImageBuffer(
  input: string | Buffer,
): Promise<ImageBufferResult> {
  try {
    const image = await Jimp.read(input);
    const { width, height } = image.bitmap;
    const imageBuffer = image.bitmap.data;
    return { imageBuffer, width, height };
  } catch (error) {
    throw new Error(formatErrorMessage("Failed to load image buffer", error));
  }
}

/**
 * Reconstruct a PNG image from blocks
 * @param blocks Array of block buffers
 * @param width Target image width in pixels
 * @param height Target image height in pixels
 * @param blockSize Block size in pixels
 * @returns Promise resolving to PNG buffer
 */
export async function blocksToPngImage(
  blocks: Buffer[],
  width: number,
  height: number,
  blockSize: number,
): Promise<Buffer> {
  try {
    const imageBuffer = blocksToImageBuffer(blocks, width, height, blockSize);
    return await createPngFromImageBuffer(imageBuffer, width, height);
  } catch (error) {
    throw new Error(
      formatErrorMessage("Failed to reconstruct PNG image from blocks", error),
    );
  }
}

/**
 * Extract raw RGBA image buffer from a PNG buffer using Jimp
 * @param pngBuffer PNG image buffer
 * @returns Promise resolving to image buffer and image dimensions
 */
export async function extractImageBufferFromPng(
  pngBuffer: Buffer,
): Promise<{ imageBuffer: Buffer; width: number; height: number }> {
  try {
    const image = await Jimp.read(pngBuffer);
    const { width, height } = image.bitmap;
    const imageBuffer = Buffer.from(image.bitmap.data);

    return { imageBuffer, width, height };
  } catch (error) {
    throw new Error(
      formatErrorMessage("Failed to extract image buffer from PNG", error),
    );
  }
}

/**
 * Create a PNG buffer from raw RGBA image buffer using Jimp
 * @param imageBuffer Raw RGBA image buffer
 * @param width Image width in pixels
 * @param height Image height in pixels
 * @returns Promise resolving to PNG buffer
 */
export async function createPngFromImageBuffer(
  imageBuffer: Buffer,
  width: number,
  height: number,
): Promise<Buffer> {
  try {
    const image = createJimpFromImageBuffer(imageBuffer, width, height);
    return await image.getBuffer(JimpMime.png);
  } catch (error) {
    throw new Error(
      formatErrorMessage("Failed to create PNG from image buffer", error),
    );
  }
}

/**
 * Copy a block from a source image buffer into a target image buffer.
 * This avoids allocating intermediate block buffers.
 */
export function copyBlockFromImageBuffer(
  sourceBuffer: Uint8Array,
  sourceWidth: number,
  sourceHeight: number,
  blockSize: number,
  sourceBlockIndex: number,
  targetBuffer: Uint8Array,
  targetWidth: number,
  targetHeight: number,
  targetBlockIndex: number,
  targetBlocksPerRow: number,
): void {
  if (blockSize <= 0) return;

  const sourceBlocksPerRow = Math.ceil(sourceWidth / blockSize);
  if (sourceBlocksPerRow <= 0 || targetBlocksPerRow <= 0) return;

  const sourceBlockX = sourceBlockIndex % sourceBlocksPerRow;
  const sourceBlockY = Math.floor(sourceBlockIndex / sourceBlocksPerRow);
  const sourceStartX = sourceBlockX * blockSize;
  const sourceStartY = sourceBlockY * blockSize;

  const targetBlockX = targetBlockIndex % targetBlocksPerRow;
  const targetBlockY = Math.floor(targetBlockIndex / targetBlocksPerRow);
  const targetStartX = targetBlockX * blockSize;
  const targetStartY = targetBlockY * blockSize;

  const availableSourceWidth = sourceWidth - sourceStartX;
  const availableSourceHeight = sourceHeight - sourceStartY;
  const availableTargetWidth = targetWidth - targetStartX;
  const availableTargetHeight = targetHeight - targetStartY;

  const actualWidth = Math.min(
    blockSize,
    availableSourceWidth,
    availableTargetWidth,
  );
  const actualHeight = Math.min(
    blockSize,
    availableSourceHeight,
    availableTargetHeight,
  );

  if (actualWidth <= 0 || actualHeight <= 0) return;

  const rowLength = actualWidth * RGBA_CHANNELS;

  for (let y = 0; y < actualHeight; y++) {
    const srcRowStart =
      ((sourceStartY + y) * sourceWidth + sourceStartX) * RGBA_CHANNELS;
    const destRowStart =
      ((targetStartY + y) * targetWidth + targetStartX) * RGBA_CHANNELS;
    targetBuffer.set(
      sourceBuffer.subarray(srcRowStart, srcRowStart + rowLength),
      destRowStart,
    );
  }
}

/**
 * Apply a function to blocks per image
 * @param allBlocks - All blocks to process
 * @param fragmentBlocksCount - Number of blocks per fragment
 * @param seed - Seed for the processing function
 * @param processFunc - Function to apply to blocks (shuffle or unshuffle)
 * @returns Processed blocks
 */
export function blocksPerImage(
  allBlocks: Buffer[],
  fragmentBlocksCount: number[],
  seed: number | string,
  processFunc: (blocks: Buffer[], seed: number | string) => Buffer[],
): Buffer[] {
  // Pre-allocate array to avoid resizing and stack overflow issues with push(...processed)
  // This assumes that processFunc preserves the number of blocks (which shuffle/unshuffle do)
  const processedBlocks: Buffer[] = new Array(allBlocks.length);
  let globalOffset = 0;
  let offset = 0;

  for (const blockCount of fragmentBlocksCount) {
    const imageBlocks = allBlocks.slice(offset, offset + blockCount);
    const processed = processFunc(imageBlocks, seed);

    // Copy processed blocks to the result array one by one to avoid stack overflow
    for (let i = 0; i < processed.length; i++) {
      processedBlocks[globalOffset + i] = processed[i];
    }
    globalOffset += processed.length;

    offset += blockCount;
  }

  // If the total size matches, return as is. Otherwise slice (safety check)
  if (globalOffset === processedBlocks.length) {
    return processedBlocks;
  }
  return processedBlocks.slice(0, globalOffset);
}
