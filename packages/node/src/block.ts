import {
  DEFAULT_IMAGE_OUTPUT_OPTIONS,
  RGBA_CHANNELS,
  calculateBlockCounts,
  blocksToImageBuffer as coreBlocksToImageBuffer,
  splitImageToBlocks as coreSplitImageToBlocks,
  resolveJpegQuality,
} from "@pixzle/core";
import type { ImageOutputOptions } from "@pixzle/core";
import { Jimp, JimpMime } from "jimp";

interface ImageToBlocksResult {
  blocks: Buffer[];
  width: number;
  height: number;
  channels: number;
  blockCountX: number;
  blockCountY: number;
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
 * Convert RGBA buffer to RGB by compositing alpha with background color
 * @param rgbaBuffer RGBA image buffer
 * @param width Image width
 * @param height Image height
 * @param backgroundColor Background color for transparent pixels (0=black, 255=white)
 * @returns RGBA buffer with alpha composited (full opacity)
 */
function convertRgbaToRgbForJimp(
  rgbaBuffer: Buffer,
  width: number,
  height: number,
  backgroundColor = 0,
): Buffer {
  const pixelCount = width * height;
  const resultBuffer = Buffer.alloc(pixelCount * 4);

  for (let i = 0; i < pixelCount; i++) {
    const offset = i * 4;

    const r = rgbaBuffer[offset];
    const g = rgbaBuffer[offset + 1];
    const b = rgbaBuffer[offset + 2];
    const a = rgbaBuffer[offset + 3] / 255;

    // Alpha compositing with background color
    resultBuffer[offset] = Math.round(r * a + backgroundColor * (1 - a));
    resultBuffer[offset + 1] = Math.round(g * a + backgroundColor * (1 - a));
    resultBuffer[offset + 2] = Math.round(b * a + backgroundColor * (1 - a));
    resultBuffer[offset + 3] = 255; // Full opacity
  }

  return resultBuffer;
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
 * Create an image buffer from raw RGBA image buffer using Jimp
 * Supports PNG and JPEG output with configurable quality/compression and channels
 * @param imageBuffer Raw RGBA image buffer
 * @param width Image width in pixels
 * @param height Image height in pixels
 * @param options Image output options
 * @returns Promise resolving to image buffer (PNG or JPEG)
 */
export async function createImageFromBuffer(
  imageBuffer: Buffer,
  width: number,
  height: number,
  options: ImageOutputOptions = {},
): Promise<Buffer> {
  const {
    format = DEFAULT_IMAGE_OUTPUT_OPTIONS.FORMAT,
    channels = DEFAULT_IMAGE_OUTPUT_OPTIONS.CHANNELS,
    jpegQuality = DEFAULT_IMAGE_OUTPUT_OPTIONS.JPEG_QUALITY,
    pngCompressionLevel = DEFAULT_IMAGE_OUTPUT_OPTIONS.PNG_COMPRESSION_LEVEL,
  } = options;

  try {
    // Convert to RGB if requested (or if JPEG format since JPEG doesn't support alpha)
    const shouldConvertToRgb = channels === 3 || format === "jpeg";
    const processedBuffer = shouldConvertToRgb
      ? convertRgbaToRgbForJimp(imageBuffer, width, height)
      : imageBuffer;

    // Create Jimp image
    const image = createJimpFromImageBuffer(processedBuffer, width, height);

    if (format === "jpeg") {
      // Set JPEG quality via getBuffer options
      const qualityValue = resolveJpegQuality(jpegQuality);
      return await image.getBuffer(JimpMime.jpeg, {
        quality: qualityValue,
      });
    }
    // Set PNG compression level (deflateLevel in Jimp)
    return await image.getBuffer(JimpMime.png, {
      deflateLevel: pngCompressionLevel,
    });
  } catch (error) {
    throw new Error(
      formatErrorMessage(
        `Failed to create ${format.toUpperCase()} from image buffer`,
        error,
      ),
    );
  }
}

/**
 * Reconstruct an image from blocks
 * @param blocks Array of block buffers
 * @param width Target image width in pixels
 * @param height Target image height in pixels
 * @param blockSize Block size in pixels
 * @param options Image output options
 * @returns Promise resolving to image buffer (PNG or JPEG)
 */
export async function blocksToImage(
  blocks: Buffer[],
  width: number,
  height: number,
  blockSize: number,
  options: ImageOutputOptions = {},
): Promise<Buffer> {
  try {
    const imageBuffer = blocksToImageBuffer(blocks, width, height, blockSize);
    return await createImageFromBuffer(imageBuffer, width, height, options);
  } catch (error) {
    throw new Error(
      formatErrorMessage("Failed to reconstruct image from blocks", error),
    );
  }
}

/**
 * Reconstruct a PNG image from blocks
 * @param blocks Array of block buffers
 * @param width Target image width in pixels
 * @param height Target image height in pixels
 * @param blockSize Block size in pixels
 * @returns Promise resolving to PNG buffer
 * @deprecated Use blocksToImage instead
 */
export async function blocksToPngImage(
  blocks: Buffer[],
  width: number,
  height: number,
  blockSize: number,
): Promise<Buffer> {
  return blocksToImage(blocks, width, height, blockSize, {
    format: "png",
    channels: 4,
  });
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
 * @deprecated Use createImageFromBuffer instead
 */
export async function createPngFromImageBuffer(
  imageBuffer: Buffer,
  width: number,
  height: number,
): Promise<Buffer> {
  return createImageFromBuffer(imageBuffer, width, height, {
    format: "png",
    channels: 4,
  });
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
  const processedBlocks: Buffer[] = [];
  let offset = 0;

  for (const blockCount of fragmentBlocksCount) {
    const imageBlocks = allBlocks.slice(offset, offset + blockCount);
    const processed = processFunc(imageBlocks, seed);
    processedBlocks.push(...processed);
    offset += blockCount;
  }

  return processedBlocks;
}
