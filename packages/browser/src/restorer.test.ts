import { describe, expect, it, vi } from "vitest";
import * as blockModule from "./block";
import { ImageRestorer } from "./restorer";

// Mock the block module
vi.mock("./block", () => ({
  splitImageToBlocks: vi.fn(),
  blocksToImageBitmap: vi.fn(),
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

describe("ImageRestorer", () => {
  it("should restore image from ImageBitmap", async () => {
    const restorer = new ImageRestorer();
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
    vi.mocked(blockModule.blocksToImageBitmap).mockResolvedValue(
      mockRestoredImage,
    );

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
    expect(blockModule.blocksToImageBitmap).toHaveBeenCalled();
    expect(result).toBe(mockRestoredImage);
  });

  it("should restore image from Blob", async () => {
    const restorer = new ImageRestorer();
    const mockBlob = new Blob([""]);
    const blockSize = 10;
    const seed = 123;
    const imageInfo = { w: 100, h: 100 };

    const mockRestoredImage = { width: 100, height: 100 } as ImageBitmap;
    vi.mocked(blockModule.blocksToImageBitmap).mockResolvedValue(
      mockRestoredImage,
    );
    vi.mocked(blockModule.splitImageToBlocks).mockReturnValue([]);

    await restorer.restoreImage(mockBlob, blockSize, seed, imageInfo);

    expect(global.createImageBitmap).toHaveBeenCalledWith(mockBlob);
  });

  it("should restore image from URL string", async () => {
    const restorer = new ImageRestorer();
    const mockUrl = "http://example.com/image.png";
    const blockSize = 10;
    const seed = 123;
    const imageInfo = { w: 100, h: 100 };

    // Mock fetch
    const mockBlob = new Blob([""]);
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => mockBlob,
    });

    const mockRestoredImage = { width: 100, height: 100 } as ImageBitmap;
    vi.mocked(blockModule.blocksToImageBitmap).mockResolvedValue(
      mockRestoredImage,
    );
    vi.mocked(blockModule.splitImageToBlocks).mockReturnValue([]);

    await restorer.restoreImage(mockUrl, blockSize, seed, imageInfo);

    expect(global.fetch).toHaveBeenCalledWith(mockUrl);
    expect(global.createImageBitmap).toHaveBeenCalledWith(mockBlob);
    expect(blockModule.splitImageToBlocks).toHaveBeenCalled();
  });

  it("should restore image from URL object", async () => {
    const restorer = new ImageRestorer();
    const mockUrl = new URL("http://example.com/image.png");
    const blockSize = 10;
    const seed = 123;
    const imageInfo = { w: 100, h: 100 };

    // Mock fetch
    const mockBlob = new Blob([""]);
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => mockBlob,
    });

    const mockRestoredImage = { width: 100, height: 100 } as ImageBitmap;
    vi.mocked(blockModule.blocksToImageBitmap).mockResolvedValue(
      mockRestoredImage,
    );
    vi.mocked(blockModule.splitImageToBlocks).mockReturnValue([]);

    await restorer.restoreImage(mockUrl, blockSize, seed, imageInfo);

    expect(global.fetch).toHaveBeenCalledWith(mockUrl.toString());
    expect(global.createImageBitmap).toHaveBeenCalledWith(mockBlob);
    expect(blockModule.splitImageToBlocks).toHaveBeenCalled();
  });
});
