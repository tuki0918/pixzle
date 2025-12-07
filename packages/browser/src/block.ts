import {
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
  const processedBlocks: Uint8Array[] = [];
  let offset = 0;

  for (const blockCount of fragmentBlocksCount) {
    const imageBlocks = allBlocks.slice(offset, offset + blockCount);
    const processed = processFunc(imageBlocks, seed);
    processedBlocks.push(...processed);
    offset += blockCount;
  }

  return processedBlocks;
}
