import { describe, expect, it, vi } from "vitest";
import * as blockModule from "./block";
import { BrowserImageRestorer } from "./restorer";

// Mock the block module
vi.mock("./block", () => ({
  splitImageToBlocks: vi.fn(),
  blocksToImage: vi.fn(),
}));

// Mock ImageBitmap class
const MockImageBitmap = class {
  width: number;
  height: number;
  close() {}
  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }
};
// biome-ignore lint/suspicious/noExplicitAny: Mocking global ImageBitmap
global.ImageBitmap = MockImageBitmap as any;

// Mock createImageBitmap
global.createImageBitmap = vi.fn().mockImplementation(async (source) => {
  return new MockImageBitmap(100, 100) as unknown as ImageBitmap;
});

describe("BrowserImageRestorer", () => {
  it("should restore image from ImageBitmap", async () => {
    const restorer = new BrowserImageRestorer();
    const mockImage = new MockImageBitmap(100, 100) as unknown as ImageBitmap;
    const blockSize = 10;
    const seed = 123;
    const imageInfo = { w: 100, h: 100 };

    const mockBlocks = [new Uint8Array(10)];
    const mockRestoredImage = new MockImageBitmap(
      100,
      100,
    ) as unknown as ImageBitmap;

    vi.mocked(blockModule.splitImageToBlocks).mockReturnValue(mockBlocks);
    vi.mocked(blockModule.blocksToImage).mockResolvedValue(mockRestoredImage);

    const result = await restorer.restoreImage(
      mockImage,
      blockSize,
      seed,
      imageInfo,
    );

    expect(blockModule.splitImageToBlocks).toHaveBeenCalledWith(
      mockImage,
      blockSize,
    );
    // unshuffle is called internally, we assume it works or mock it if we want to test exact order
    expect(blockModule.blocksToImage).toHaveBeenCalled();
    expect(result).toBe(mockRestoredImage);
  });

  it("should restore image from Blob", async () => {
    const restorer = new BrowserImageRestorer();
    const mockBlob = new Blob([""]);
    const blockSize = 10;
    const seed = 123;
    const imageInfo = { w: 100, h: 100 };

    const mockRestoredImage = { width: 100, height: 100 } as ImageBitmap;
    vi.mocked(blockModule.blocksToImage).mockResolvedValue(mockRestoredImage);
    vi.mocked(blockModule.splitImageToBlocks).mockReturnValue([]);

    await restorer.restoreImage(mockBlob, blockSize, seed, imageInfo);

    expect(global.createImageBitmap).toHaveBeenCalledWith(mockBlob);
  });

  it("should restore image from URL string", async () => {
    const restorer = new BrowserImageRestorer();
    const mockUrl = "http://example.com/image.png";
    const blockSize = 10;
    const seed = 123;
    const imageInfo = { w: 100, h: 100 };

    // Mock Image loading
    const originalImage = global.Image;
    global.Image = class {
      onload: () => void = () => {};
      onerror: () => void = () => {};
      src = "";
      crossOrigin = "";
      width = 100;
      height = 100;

      constructor() {
        setTimeout(() => this.onload(), 0);
      }
      // biome-ignore lint/suspicious/noExplicitAny: Mocking global Image
    } as any;

    const mockRestoredImage = { width: 100, height: 100 } as ImageBitmap;
    vi.mocked(blockModule.blocksToImage).mockResolvedValue(mockRestoredImage);
    vi.mocked(blockModule.splitImageToBlocks).mockReturnValue([]);

    await restorer.restoreImage(mockUrl, blockSize, seed, imageInfo);

    // Restore global Image
    global.Image = originalImage;

    expect(blockModule.splitImageToBlocks).toHaveBeenCalled();
  });

  it("should restore image from URL object", async () => {
    const restorer = new BrowserImageRestorer();
    const mockUrl = new URL("http://example.com/image.png");
    const blockSize = 10;
    const seed = 123;
    const imageInfo = { w: 100, h: 100 };

    // Mock Image loading
    const originalImage = global.Image;
    global.Image = class {
      onload: () => void = () => {};
      onerror: () => void = () => {};
      src = "";
      crossOrigin = "";
      width = 100;
      height = 100;

      constructor() {
        setTimeout(() => this.onload(), 0);
      }
      // biome-ignore lint/suspicious/noExplicitAny: Mocking global Image
    } as any;

    const mockRestoredImage = { width: 100, height: 100 } as ImageBitmap;
    vi.mocked(blockModule.blocksToImage).mockResolvedValue(mockRestoredImage);
    vi.mocked(blockModule.splitImageToBlocks).mockReturnValue([]);

    await restorer.restoreImage(mockUrl, blockSize, seed, imageInfo);

    // Restore global Image
    global.Image = originalImage;

    expect(blockModule.splitImageToBlocks).toHaveBeenCalled();
  });
});
