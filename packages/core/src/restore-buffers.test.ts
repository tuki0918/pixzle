import { blocksToImageBuffer, splitImageToBlocks } from "./block-operations";
import { createPermutation } from "./block-permutation";
import { calculateBlockCountsForCrossImages } from "./block-utils";
import { createSingleImageManifest } from "./helpers";
import {
  restoreImageBuffers,
  restoreSingleImageBuffer,
} from "./restore-buffers";
import type { ImageBufferData, ManifestData } from "./types";

function createTestBuffer(
  width: number,
  height: number,
  startValue = 1,
): Uint8Array {
  const buffer = new Uint8Array(width * height * 4);

  for (let index = 0; index < width * height; index++) {
    const value = startValue + index;
    const offset = index * 4;
    buffer[offset] = value;
    buffer[offset + 1] = value;
    buffer[offset + 2] = value;
    buffer[offset + 3] = 255;
  }

  return buffer;
}

describe("restoreImageBuffers", () => {
  test("restores a single image from a shuffled fragment", () => {
    const original = createTestBuffer(4, 4);
    const manifest = createSingleImageManifest({
      blockSize: 2,
      seed: 123,
      imageInfo: { w: 4, h: 4 },
    });

    const shuffledManifest: ManifestData = {
      ...manifest,
      config: {
        ...manifest.config,
        crossImageShuffle: false,
      },
    };

    const blocks = splitImageToBlocks(original, 4, 4, 2);
    const permutation = createPermutation(blocks.length, manifest.config.seed);
    const shuffledBlocks = permutation.map((index) => blocks[index]);
    const shuffled = [
      blocksToImageBuffer(shuffledBlocks, 4, 4, manifest.config.blockSize),
    ];

    const restored = restoreImageBuffers(
      [{ buffer: shuffled[0], width: 4, height: 4 }],
      shuffledManifest,
    );

    expect(restored).toEqual([original]);
  });

  test("restores a single image buffer directly", () => {
    const original = createTestBuffer(4, 4);
    const manifest = createSingleImageManifest({
      blockSize: 2,
      seed: 123,
      imageInfo: { w: 4, h: 4 },
    });
    const shuffledManifest: ManifestData = {
      ...manifest,
      config: {
        ...manifest.config,
        crossImageShuffle: false,
      },
    };
    const blocks = splitImageToBlocks(original, 4, 4, 2);
    const permutation = createPermutation(blocks.length, manifest.config.seed);
    const shuffledBlocks = permutation.map((index) => blocks[index]);
    const shuffled = blocksToImageBuffer(
      shuffledBlocks,
      4,
      4,
      manifest.config.blockSize,
    );

    const restored = restoreSingleImageBuffer(
      { buffer: shuffled, width: 4, height: 4 },
      shuffledManifest.config,
      shuffledManifest.images[0],
    );

    expect(restored).toEqual(original);
  });

  test("restores multiple images with cross-image shuffle", () => {
    const imageA = createTestBuffer(2, 2, 1);
    const imageB = createTestBuffer(2, 2, 10);

    const manifest: ManifestData = {
      id: "test",
      version: "0.0.0",
      timestamp: new Date().toISOString(),
      config: {
        blockSize: 1,
        seed: 77,
        prefix: "img",
        preserveName: false,
        crossImageShuffle: true,
      },
      images: [
        { w: 2, h: 2 },
        { w: 2, h: 2 },
      ],
    };

    const allBlocks = [
      ...splitImageToBlocks(imageA, 2, 2, 1),
      ...splitImageToBlocks(imageB, 2, 2, 1),
    ];
    const permutation = createPermutation(
      allBlocks.length,
      manifest.config.seed,
    );
    const shuffledBlocks = permutation.map((index) => allBlocks[index]);
    const blockCounts = calculateBlockCountsForCrossImages(allBlocks.length, 2);
    const shuffled = blockCounts.map((blockCount, fragmentIndex) => {
      const start = blockCounts
        .slice(0, fragmentIndex)
        .reduce((sum, count) => sum + count, 0);
      const fragmentBlocks = shuffledBlocks.slice(start, start + blockCount);
      return blocksToImageBuffer(
        fragmentBlocks,
        2,
        2,
        manifest.config.blockSize,
      );
    });

    const restored = restoreImageBuffers(
      shuffled.map(
        (buffer): ImageBufferData => ({
          buffer,
          width: 2,
          height: 2,
        }),
      ),
      manifest,
    );

    expect(restored).toEqual([imageA, imageB]);
  });
});
