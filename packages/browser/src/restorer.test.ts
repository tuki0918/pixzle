import { afterEach, describe, expect, it, vi } from "vitest";
import * as blockModule from "./image-buffer";
import { ImageRestorer } from "./restorer";

const { restoreImageBuffersMock } = vi.hoisted(() => ({
  restoreImageBuffersMock: vi.fn(),
}));

vi.mock("@pixzle/core", async () => {
  const actual =
    await vi.importActual<typeof import("@pixzle/core")>("@pixzle/core");
  return {
    ...actual,
    restoreImageBuffers: restoreImageBuffersMock,
  };
});

// Mock the block module
vi.mock("./image-buffer", () => ({
  imageToImageBuffer: vi.fn(),
  imageBufferToImageBitmap: vi.fn(),
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
  afterEach(() => {
    vi.restoreAllMocks();
    restoreImageBuffersMock.mockReset();
  });

  it("should restore image from ImageBitmap", async () => {
    const restorer = new ImageRestorer();
    const mockImage = new MockImageBitmap(100, 100) as unknown as ImageBitmap;
    const blockSize = 10;
    const seed = 123;
    const imageInfo = { w: 100, h: 100 };

    const mockRestoredImage = new MockImageBitmap(
      100,
      100,
    ) as unknown as ImageBitmap;

    vi.mocked(blockModule.imageToImageBuffer).mockReturnValue({
      buffer: new Uint8Array(100 * 100 * 4),
      width: 100,
      height: 100,
    });
    vi.mocked(blockModule.imageBufferToImageBitmap).mockResolvedValue(
      mockRestoredImage,
    );

    const result = await restorer.restoreImage(
      mockImage,
      blockSize,
      seed,
      imageInfo,
    );

    expect(blockModule.imageToImageBuffer).toHaveBeenCalledWith(mockImage);
    expect(blockModule.imageBufferToImageBitmap).toHaveBeenCalled();
    expect(result).toBe(mockRestoredImage);
  });

  it("should restore image from Blob", async () => {
    const restorer = new ImageRestorer();
    const mockBlob = new Blob([""]);
    const blockSize = 10;
    const seed = 123;
    const imageInfo = { w: 100, h: 100 };

    const mockRestoredImage = { width: 100, height: 100 } as ImageBitmap;
    vi.mocked(blockModule.imageToImageBuffer).mockReturnValue({
      buffer: new Uint8Array(100 * 100 * 4),
      width: 100,
      height: 100,
    });
    vi.mocked(blockModule.imageBufferToImageBitmap).mockResolvedValue(
      mockRestoredImage,
    );

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
    vi.mocked(blockModule.imageToImageBuffer).mockReturnValue({
      buffer: new Uint8Array(100 * 100 * 4),
      width: 100,
      height: 100,
    });
    vi.mocked(blockModule.imageBufferToImageBitmap).mockResolvedValue(
      mockRestoredImage,
    );

    await restorer.restoreImage(mockUrl, blockSize, seed, imageInfo);

    expect(global.fetch).toHaveBeenCalledWith(mockUrl, undefined);
    expect(global.createImageBitmap).toHaveBeenCalledWith(mockBlob);
    expect(blockModule.imageToImageBuffer).toHaveBeenCalled();
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
    vi.mocked(blockModule.imageToImageBuffer).mockReturnValue({
      buffer: new Uint8Array(100 * 100 * 4),
      width: 100,
      height: 100,
    });
    vi.mocked(blockModule.imageBufferToImageBitmap).mockResolvedValue(
      mockRestoredImage,
    );

    await restorer.restoreImage(mockUrl, blockSize, seed, imageInfo);

    expect(global.fetch).toHaveBeenCalledWith(mockUrl.toString(), undefined);
    expect(global.createImageBitmap).toHaveBeenCalledWith(mockBlob);
    expect(blockModule.imageToImageBuffer).toHaveBeenCalled();
  });

  it("should wait for HTMLImageElement load without overwriting handlers", async () => {
    const restorer = new ImageRestorer();
    const image = new Image();
    const existingOnLoad = vi.fn();
    const existingOnError = vi.fn();
    image.onload = existingOnLoad;
    image.onerror = existingOnError;
    Object.defineProperty(image, "complete", {
      configurable: true,
      value: false,
    });

    const addEventListenerSpy = vi.spyOn(image, "addEventListener");
    const removeEventListenerSpy = vi.spyOn(image, "removeEventListener");

    vi.mocked(blockModule.imageToImageBuffer).mockReturnValue({
      buffer: new Uint8Array(100 * 100 * 4),
      width: 100,
      height: 100,
    });
    vi.mocked(blockModule.imageBufferToImageBitmap).mockResolvedValue(
      new MockImageBitmap(100, 100) as unknown as ImageBitmap,
    );

    const restorePromise = restorer.restoreImage(image, 10, 123, {
      w: 100,
      h: 100,
    });

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "load",
      expect.any(Function),
      { once: true },
    );
    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "error",
      expect.any(Function),
      { once: true },
    );

    image.dispatchEvent(new Event("load"));
    await restorePromise;

    expect(image.onload).toBe(existingOnLoad);
    expect(image.onerror).toBe(existingOnError);
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "load",
      expect.any(Function),
    );
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "error",
      expect.any(Function),
    );
  });

  it("should release restored raw buffers after converting cross-image results", async () => {
    const restorer = new ImageRestorer();
    const restoredBuffers = [
      new Uint8Array(100 * 100 * 4),
      new Uint8Array(50 * 50 * 4),
    ];

    restoreImageBuffersMock.mockReturnValue(restoredBuffers);
    vi.mocked(blockModule.imageToImageBuffer).mockReturnValue({
      buffer: new Uint8Array(100 * 100 * 4),
      width: 100,
      height: 100,
    });
    vi.mocked(blockModule.imageBufferToImageBitmap)
      .mockResolvedValueOnce(
        new MockImageBitmap(100, 100) as unknown as ImageBitmap,
      )
      .mockResolvedValueOnce(
        new MockImageBitmap(50, 50) as unknown as ImageBitmap,
      );

    await restorer.restoreImages(
      [
        new MockImageBitmap(100, 100) as unknown as ImageBitmap,
        new MockImageBitmap(100, 100) as unknown as ImageBitmap,
      ],
      {
        id: "test",
        version: "0.0.0",
        timestamp: new Date().toISOString(),
        config: {
          blockSize: 10,
          seed: 123,
          prefix: "img",
          preserveName: false,
          crossImageShuffle: true,
        },
        images: [
          { w: 100, h: 100 },
          { w: 50, h: 50 },
        ],
      },
    );

    expect(restoredBuffers[0]).toHaveLength(0);
    expect(restoredBuffers[1]).toHaveLength(0);
  });
});
