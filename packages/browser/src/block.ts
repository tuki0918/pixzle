import {
  RGBA_CHANNELS,
  blocksToImageBuffer as coreBlocksToImageBuffer,
  splitImageToBlocks as coreSplitImageToBlocks,
} from "@pixzle/core";

/**
 * Split an image (HTMLImageElement or ImageBitmap) into blocks
 */
export function splitImageToBlocks(
  image: HTMLImageElement | ImageBitmap,
  blockSize: number,
): Uint8Array[] {
  const width =
    image instanceof HTMLImageElement ? image.naturalWidth : image.width;
  const height =
    image instanceof HTMLImageElement ? image.naturalHeight : image.height;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get 2D context");

  ctx.drawImage(image, 0, 0);
  const imageData = ctx.getImageData(0, 0, width, height);

  // imageData.data is Uint8ClampedArray, we need Uint8Array
  // We create a copy to avoid issues if the canvas is reused or garbage collected in weird ways,
  // though here it's local.
  // coreSplitImageToBlocks expects Uint8Array.
  const buffer = new Uint8Array(
    imageData.data.buffer,
    imageData.data.byteOffset,
    imageData.data.byteLength,
  );

  return coreSplitImageToBlocks(buffer, width, height, blockSize);
}

/**
 * Extract a raw RGBA buffer from an image
 */
export function imageToImageBuffer(image: HTMLImageElement | ImageBitmap): {
  buffer: Uint8Array;
  width: number;
  height: number;
} {
  const width =
    image instanceof HTMLImageElement ? image.naturalWidth : image.width;
  const height =
    image instanceof HTMLImageElement ? image.naturalHeight : image.height;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get 2D context");

  ctx.drawImage(image, 0, 0);
  const imageData = ctx.getImageData(0, 0, width, height);

  const buffer = new Uint8Array(
    imageData.data.buffer,
    imageData.data.byteOffset,
    imageData.data.byteLength,
  );

  return { buffer, width, height };
}

/**
 * Create an ImageBitmap from a raw RGBA buffer
 */
export async function imageBufferToImageBitmap(
  buffer: Uint8Array,
  width: number,
  height: number,
): Promise<ImageBitmap> {
  const imageData = new ImageData(
    new Uint8ClampedArray(
      buffer.buffer as ArrayBuffer,
      buffer.byteOffset,
      buffer.byteLength,
    ),
    width,
    height,
  );

  return createImageBitmap(imageData);
}

/**
 * Create an ImageBitmap from blocks
 */
export async function blocksToImageBitmap(
  blocks: Uint8Array[],
  width: number,
  height: number,
  blockSize: number,
): Promise<ImageBitmap> {
  const buffer = coreBlocksToImageBuffer(blocks, width, height, blockSize);

  // Create ImageData
  const imageData = new ImageData(
    new Uint8ClampedArray(
      buffer.buffer as ArrayBuffer,
      buffer.byteOffset,
      buffer.byteLength,
    ),
    width,
    height,
  );

  return createImageBitmap(imageData);
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
 * Process blocks per image using a provided function (shuffle/unshuffle)
 * @param allBlocks - All blocks to process
 * @param fragmentBlocksCount - Number of blocks per fragment
 * @param seed - Seed for the processing function
 * @param processFunc - Function to apply to blocks (shuffle or unshuffle)
 * @returns Processed blocks
 */
export function blocksPerImage(
  allBlocks: Uint8Array[],
  fragmentBlocksCount: number[],
  seed: number | string,
  processFunc: (blocks: Uint8Array[], seed: number | string) => Uint8Array[],
): Uint8Array[] {
  // Pre-allocate array to avoid resizing and stack overflow issues with push(...processed)
  const processedBlocks: Uint8Array[] = new Array(allBlocks.length);
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
