import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PixzleImage } from "./PixzleImage";

// Mock ImageRestorer
vi.mock("@pixzle/browser", () => {
  return {
    ImageRestorer: vi.fn().mockImplementation(() => {
      return {
        restoreImage: vi.fn().mockResolvedValue({
          width: 100,
          height: 100,
          close: () => {},
        }),
      };
    }),
  };
});

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = vi.fn(() => "blob:mock-url");
global.URL.revokeObjectURL = vi.fn();

// Mock Canvas
const mockGetContext = vi.fn().mockReturnValue({
  drawImage: vi.fn(),
  // biome-ignore lint/suspicious/noExplicitAny: Mocking canvas context
} as any);

const mockToBlob = vi.fn((callback) => {
  callback(new Blob(["mock"], { type: "image/png" }));
});

// biome-ignore lint/suspicious/noExplicitAny: Mocking HTMLCanvasElement
HTMLCanvasElement.prototype.getContext = mockGetContext as any;
HTMLCanvasElement.prototype.toBlob = mockToBlob;

describe("PixzleImage", () => {
  afterEach(() => {
    cleanup();
  });

  const defaultProps = {
    blockSize: 10,
    seed: 123,
    imageInfo: { w: 100, h: 100 },
    image: "http://example.com/shuffled.png",
    alt: "Restored Image",
  };

  it("should render nothing initially", () => {
    const { container } = render(<PixzleImage {...defaultProps} />);
    expect(container.firstChild).toBeNull();
  });

  it("should render image after restoration", async () => {
    // Spy on console.error to catch any hidden errors
    const consoleSpy = vi.spyOn(console, "error");

    render(<PixzleImage {...defaultProps} />);

    await waitFor(() => {
      // If this fails, check console output
      if (consoleSpy.mock.calls.length > 0) {
        console.log("Console error called:", consoleSpy.mock.calls);
      }
      const img = screen.getByAltText("Restored Image");
      expect(img).toBeDefined();
      expect(img.getAttribute("src")).toBe("blob:mock-url");
    });

    consoleSpy.mockRestore();
  });

  it("should handle errors gracefully", async () => {
    // Mock console.error to avoid noise
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Mock restoreImage to fail
    const { ImageRestorer } = await import("@pixzle/browser");
    // biome-ignore lint/suspicious/noExplicitAny: Mocking implementation
    (ImageRestorer as any).mockImplementationOnce(() => ({
      restoreImage: vi.fn().mockRejectedValue(new Error("Restoration failed")),
    }));

    render(<PixzleImage {...defaultProps} />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        "PixzleImage restoration error:",
        expect.any(Error),
      );
    });

    consoleSpy.mockRestore();
  });
});
