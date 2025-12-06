import { describe, expect, it, vi } from "vitest";
import { fetchBuffer, isUrl, loadBuffer, loadJson } from "./file";

describe("isUrl", () => {
  it("should return true for http URLs", () => {
    expect(isUrl("http://example.com/image.png")).toBe(true);
    expect(isUrl("http://localhost:3000/test.jpg")).toBe(true);
  });

  it("should return true for https URLs", () => {
    expect(isUrl("https://example.com/image.png")).toBe(true);
    expect(isUrl("https://cdn.example.com/path/to/image.jpg")).toBe(true);
  });

  it("should return false for local file paths", () => {
    expect(isUrl("/path/to/file.png")).toBe(false);
    expect(isUrl("./relative/path.jpg")).toBe(false);
    expect(isUrl("C:\\Windows\\path.png")).toBe(false);
    expect(isUrl("file.png")).toBe(false);
  });

  it("should return false for file:// URLs", () => {
    expect(isUrl("file:///path/to/file.png")).toBe(false);
  });

  it("should return false for invalid URLs", () => {
    expect(isUrl("")).toBe(false);
    expect(isUrl("not-a-url")).toBe(false);
    expect(isUrl("ftp://example.com/file")).toBe(false);
  });
});

describe("fetchBuffer", () => {
  it("should fetch data from a URL and return as Buffer", async () => {
    const testData = new Uint8Array([1, 2, 3, 4, 5]);
    const mockResponse = {
      ok: true,
      arrayBuffer: vi.fn().mockResolvedValue(testData.buffer),
    };
    global.fetch = vi.fn().mockResolvedValue(mockResponse);

    const result = await fetchBuffer("https://example.com/test.bin");

    expect(fetch).toHaveBeenCalledWith("https://example.com/test.bin");
    expect(result).toBeInstanceOf(Buffer);
    expect(result).toEqual(Buffer.from(testData));
  });

  it("should throw an error for non-OK responses", async () => {
    const mockResponse = {
      ok: false,
      status: 404,
      statusText: "Not Found",
    };
    global.fetch = vi.fn().mockResolvedValue(mockResponse);

    await expect(
      fetchBuffer("https://example.com/notfound.png"),
    ).rejects.toThrow(
      "Failed to fetch https://example.com/notfound.png: 404 Not Found",
    );
  });
});

describe("loadBuffer", () => {
  it("should use fetch for URLs", async () => {
    const testData = new Uint8Array([10, 20, 30]);
    const mockResponse = {
      ok: true,
      arrayBuffer: vi.fn().mockResolvedValue(testData.buffer),
    };
    global.fetch = vi.fn().mockResolvedValue(mockResponse);

    const result = await loadBuffer("https://example.com/image.png");

    expect(fetch).toHaveBeenCalledWith("https://example.com/image.png");
    expect(result).toEqual(Buffer.from(testData));
  });
});

describe("loadJson", () => {
  it("should fetch and parse JSON from URL", async () => {
    const testJson = { name: "test", value: 123 };
    const mockResponse = {
      ok: true,
      arrayBuffer: vi
        .fn()
        .mockResolvedValue(
          new TextEncoder().encode(JSON.stringify(testJson)).buffer,
        ),
    };
    global.fetch = vi.fn().mockResolvedValue(mockResponse);

    const result = await loadJson("https://example.com/data.json");

    expect(fetch).toHaveBeenCalledWith("https://example.com/data.json");
    expect(result).toEqual(testJson);
  });
});
