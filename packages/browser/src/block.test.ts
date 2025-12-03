import { describe, expect, it, vi } from "vitest";
import { blocksToImage, splitImageToBlocks } from "./block";

// Mock createImageBitmap since it's not available in happy-dom/jsdom usually
global.createImageBitmap = vi.fn().mockImplementation(async (imageData) => {
  return {
    width: imageData.width,
    height: imageData.height,
    close: () => {},
  } as ImageBitmap;
});

// Mock ImageData
global.ImageData = class {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  colorSpace: PredefinedColorSpace = "srgb";

  constructor(
    dataOrWidth: Uint8ClampedArray | number,
    widthOrHeight: number,
    height?: number,
  ) {
    if (typeof dataOrWidth === "number") {
      this.width = dataOrWidth;
      this.height = widthOrHeight;
      this.data = new Uint8ClampedArray(this.width * this.height * 4);
    } else {
      this.data = dataOrWidth;
      this.width = widthOrHeight;
      this.height = height || 0;
    }
  }
  // biome-ignore lint/suspicious/noExplicitAny: Mocking global ImageData
} as any;

describe("block operations", () => {
  it("should split image to blocks", () => {
    // Mock canvas getContext
    const mockContext = {
      drawImage: vi.fn(),
      getImageData: vi.fn().mockReturnValue({
        data: new Uint8ClampedArray(4 * 4 * 4).fill(255),
        width: 4,
        height: 4,
      }),
    };

    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = vi
      .fn()
      .mockReturnValue(mockContext);

    // Create a mock image
    const width = 4;
    const height = 4;

    // ...existing code...
    const img = new Image();
    img.width = width;
    img.height = height;
    // ...existing code...

    // We don't need to spy on document.createElement anymore if we mock prototype.getContext
    // But splitImageToBlocks creates a new canvas, so mocking prototype is good.

    const blockSize = 2;
    const blocks = splitImageToBlocks(img, blockSize);

    expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalledWith("2d");
    expect(mockContext.drawImage).toHaveBeenCalledWith(img, 0, 0);
    expect(mockContext.getImageData).toHaveBeenCalledWith(0, 0, width, height);

    // 4x4 image, block size 2 -> 4 blocks.
    // Each block is 2x2 = 4 pixels. 4 channels. 16 bytes.
    expect(blocks.length).toBe(4);
    expect(blocks[0].length).toBe(2 * 2 * 4);

    // Restore
    HTMLCanvasElement.prototype.getContext = originalGetContext;
  });

  it("should convert blocks to image", async () => {
    const width = 4;
    const height = 4;
    const blockSize = 2;

    // 4 blocks of 2x2 pixels (16 bytes each)
    const blocks = [
      new Uint8Array(16).fill(1),
      new Uint8Array(16).fill(2),
      new Uint8Array(16).fill(3),
      new Uint8Array(16).fill(4),
    ];

    const result = await blocksToImage(blocks, width, height, blockSize);

    expect(global.createImageBitmap).toHaveBeenCalled();
    // Check if ImageData was created correctly
    // biome-ignore lint/suspicious/noExplicitAny: Accessing mock calls
    const callArgs = (global.createImageBitmap as any).mock.calls[0];
    const imageData = callArgs[0] as ImageData;

    expect(imageData.width).toBe(width);
    expect(imageData.height).toBe(height);
    expect(imageData.data.length).toBe(width * height * 4);

    expect(result).toBeDefined();
  });
});
