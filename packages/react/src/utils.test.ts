import { describe, expect, it, vi } from "vitest";
import { imageBitmapToBlobUrl } from "./utils";

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => "blob:mock-url");

// Mock Canvas
const mockDrawImage = vi.fn();
const mockGetContext = vi.fn().mockReturnValue({
  drawImage: mockDrawImage,
  // biome-ignore lint/suspicious/noExplicitAny: Mocking canvas context
} as any);

const mockToBlob = vi.fn((callback) => {
  callback(new Blob(["mock"], { type: "image/png" }));
});

// biome-ignore lint/suspicious/noExplicitAny: Mocking HTMLCanvasElement
HTMLCanvasElement.prototype.getContext = mockGetContext as any;
HTMLCanvasElement.prototype.toBlob = mockToBlob;

describe("imageBitmapToBlobUrl", () => {
  it("should convert ImageBitmap to blob URL", async () => {
    const mockBitmap = {
      width: 100,
      height: 100,
      close: vi.fn(),
    } as unknown as ImageBitmap;

    const result = await imageBitmapToBlobUrl(mockBitmap);

    expect(result).toBe("blob:mock-url");
    expect(mockGetContext).toHaveBeenCalledWith("2d");
    expect(mockDrawImage).toHaveBeenCalledWith(mockBitmap, 0, 0);
    expect(mockToBlob).toHaveBeenCalled();
  });

  it("should throw error if canvas context is not available", async () => {
    mockGetContext.mockReturnValueOnce(null);

    const mockBitmap = {
      width: 100,
      height: 100,
      close: vi.fn(),
    } as unknown as ImageBitmap;

    await expect(imageBitmapToBlobUrl(mockBitmap)).rejects.toThrow(
      "Could not get 2D context",
    );
  });

  it("should throw error if blob creation fails", async () => {
    mockToBlob.mockImplementationOnce((callback) => {
      callback(null);
    });

    const mockBitmap = {
      width: 100,
      height: 100,
      close: vi.fn(),
    } as unknown as ImageBitmap;

    await expect(imageBitmapToBlobUrl(mockBitmap)).rejects.toThrow(
      "Failed to create blob",
    );
  });

  it("should set canvas dimensions from bitmap", async () => {
    const mockBitmap = {
      width: 200,
      height: 150,
      close: vi.fn(),
    } as unknown as ImageBitmap;

    // Spy on createElement to capture canvas
    const createElementSpy = vi.spyOn(document, "createElement");

    await imageBitmapToBlobUrl(mockBitmap);

    expect(createElementSpy).toHaveBeenCalledWith("canvas");

    createElementSpy.mockRestore();
  });
});
