import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PixzleImages } from "./PixzleImages";

// Mock pixzle default export
vi.mock("@pixzle/browser", () => {
  return {
    default: {
      restore: vi.fn().mockResolvedValue([
        { width: 100, height: 100, close: () => {} },
        { width: 200, height: 200, close: () => {} },
      ]),
      restoreImage: vi.fn().mockResolvedValue({
        width: 100,
        height: 100,
        close: () => {},
      }),
    },
    ImageRestorer: vi.fn().mockImplementation(() => {
      return {
        restoreImages: vi.fn().mockResolvedValue([
          { width: 100, height: 100, close: () => {} },
          { width: 200, height: 200, close: () => {} },
        ]),
      };
    }),
  };
});

// Mock URL.createObjectURL and revokeObjectURL
let urlCounter = 0;
global.URL.createObjectURL = vi.fn(() => `blob:mock-url-${urlCounter++}`);
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

describe("PixzleImages", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    urlCounter = 0;
  });

  const defaultProps = {
    images: [
      "http://example.com/shuffled1.png",
      "http://example.com/shuffled2.png",
    ],
    manifestData: {
      id: "test-uuid",
      version: "1.0.0",
      timestamp: "2024-01-01T00:00:00.000Z",
      config: {
        blockSize: 10,
        seed: 123,
        prefix: "img",
        preserveName: false,
        crossImageShuffle: false,
      },
      images: [
        { w: 100, h: 100 },
        { w: 200, h: 200 },
      ],
    },
  };

  it("should render fallback while loading", () => {
    render(
      <PixzleImages {...defaultProps} fallback={<div>Loading...</div>}>
        {({ sources }) => (
          <div>
            {sources.map((src) => (
              <img key={src} src={src} alt="" />
            ))}
          </div>
        )}
      </PixzleImages>,
    );

    expect(screen.getByText("Loading...")).toBeDefined();
  });

  it("should render restored images after restoration", async () => {
    render(
      <PixzleImages {...defaultProps}>
        {({ sources }) => (
          <div data-testid="gallery">
            {sources.map((src) => (
              <img key={src} src={src} alt="" />
            ))}
          </div>
        )}
      </PixzleImages>,
    );

    await waitFor(() => {
      const gallery = screen.getByTestId("gallery");
      expect(gallery).toBeDefined();
      const images = gallery.querySelectorAll("img");
      expect(images.length).toBe(2);
    });
  });

  it("should call onLoad callback when restoration completes", async () => {
    const onLoad = vi.fn();

    render(
      <PixzleImages {...defaultProps} onLoad={onLoad}>
        {({ sources }) => (
          <div>
            {sources.map((src) => (
              <img key={src} src={src} alt="" />
            ))}
          </div>
        )}
      </PixzleImages>,
    );

    await waitFor(() => {
      expect(onLoad).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringContaining("blob:mock-url"),
          expect.stringContaining("blob:mock-url"),
        ]),
      );
    });
  });

  it("should handle errors gracefully", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const onError = vi.fn();

    const pixzle = await import("@pixzle/browser");
    vi.spyOn(pixzle.default, "restore").mockRejectedValueOnce(
      new Error("Restoration failed"),
    );

    render(
      <PixzleImages {...defaultProps} onError={onError}>
        {({ sources }) => (
          <div>
            {sources.map((src) => (
              <img key={src} src={src} alt="" />
            ))}
          </div>
        )}
      </PixzleImages>,
    );

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        "PixzleImages restoration error:",
        expect.any(Error),
      );
      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  it("should render errorFallback when error occurs", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    const pixzle = await import("@pixzle/browser");
    vi.spyOn(pixzle.default, "restore").mockRejectedValueOnce(
      new Error("Test error"),
    );

    render(
      <PixzleImages
        {...defaultProps}
        errorFallback={(error) => <div>Error: {error.message}</div>}
      >
        {({ sources }) => (
          <div>
            {sources.map((src) => (
              <img key={src} src={src} alt="" />
            ))}
          </div>
        )}
      </PixzleImages>,
    );

    await waitFor(() => {
      expect(screen.getByText("Error: Test error")).toBeDefined();
    });
  });

  it("should provide progress in children props", async () => {
    const progressValues: number[] = [];

    render(
      <PixzleImages {...defaultProps}>
        {({ sources, progress }) => {
          if (sources.length > 0) {
            progressValues.push(progress);
          }
          return (
            <div>
              {sources.map((src) => (
                <img key={src} src={src} alt="" />
              ))}
            </div>
          );
        }}
      </PixzleImages>,
    );

    await waitFor(() => {
      // Progress should be 1 when complete
      expect(progressValues).toContain(1);
    });
  });
});
