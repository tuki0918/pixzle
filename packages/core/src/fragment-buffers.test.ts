import { fragmentImageBuffers } from "./fragment-buffers";
import { restoreImageBuffers } from "./restore-buffers";
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

describe("fragmentImageBuffers", () => {
  test("fragments and restores a single image", () => {
    const image: ImageBufferData = {
      buffer: createTestBuffer(4, 4),
      width: 4,
      height: 4,
    };
    const manifest: ManifestData = {
      id: "test",
      version: "0.0.0",
      timestamp: new Date().toISOString(),
      config: {
        blockSize: 2,
        seed: 123,
        prefix: "img",
        preserveName: false,
        crossImageShuffle: false,
      },
      images: [{ w: 4, h: 4 }],
    };

    const fragments = fragmentImageBuffers([image], manifest.config);
    const restored = restoreImageBuffers(fragments, manifest);

    expect(restored).toEqual([image.buffer]);
  });

  test("fragments and restores multiple images with cross-image shuffle", () => {
    const images: ImageBufferData[] = [
      { buffer: createTestBuffer(2, 2, 1), width: 2, height: 2 },
      { buffer: createTestBuffer(2, 2, 10), width: 2, height: 2 },
    ];
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

    const fragments = fragmentImageBuffers(images, manifest.config);
    const restored = restoreImageBuffers(fragments, manifest);

    expect(restored).toEqual(images.map((image) => image.buffer));
  });
});
