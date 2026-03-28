import {
  blocksToImageBuffer as coreBlocksToImageBuffer,
  splitImageToBlocks as coreSplitImageToBlocks,
} from "@pixzle/core";

function drawImageToBuffer(image: HTMLImageElement | ImageBitmap): {
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

  return {
    buffer: new Uint8Array(
      imageData.data.buffer,
      imageData.data.byteOffset,
      imageData.data.byteLength,
    ),
    width,
    height,
  };
}

/**
 * Split an image (HTMLImageElement or ImageBitmap) into blocks
 */
export function splitImageToBlocks(
  image: HTMLImageElement | ImageBitmap,
  blockSize: number,
): Uint8Array[] {
  const { buffer, width, height } = drawImageToBuffer(image);
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
  return drawImageToBuffer(image);
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
