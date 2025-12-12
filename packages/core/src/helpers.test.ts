import {
  decodeFileName,
  encodeFileName,
  generateFileName,
  generateFragmentFileName,
  generateRestoredFileName,
  generateRestoredOriginalFileName,
  getImageFormatExtension,
  resolveJpegQuality,
} from "./helpers";
import type { ManifestData } from "./types";

describe("generateFileName", () => {
  const mockManifest = {
    config: { prefix: "img" },
    images: [{ name: "test1" }, { name: "test2" }, { name: "test3" }],
  } as ManifestData;

  test("should generate basic file names", () => {
    expect(generateFileName(mockManifest, 0)).toBe("img_1.png");
    expect(generateFileName(mockManifest, 1)).toBe("img_2.png");
    expect(generateFileName(mockManifest, 2)).toBe("img_3.png");
  });

  test("should generate fragmented file names", () => {
    expect(generateFileName(mockManifest, 0, { isFragmented: true })).toBe(
      "img_1_fragmented.png",
    );
    expect(generateFileName(mockManifest, 2, { isFragmented: true })).toBe(
      "img_3_fragmented.png",
    );
  });

  test("should pad index correctly for different lengths", () => {
    const manifest10 = {
      config: { prefix: "test" },
      images: Array(10).fill({ name: "test" }),
    } as ManifestData;
    expect(generateFileName(manifest10, 0)).toBe("test_01.png");
    expect(generateFileName(manifest10, 9)).toBe("test_10.png");

    const manifest100 = {
      config: { prefix: "test" },
      images: Array(100).fill({ name: "test" }),
    } as ManifestData;
    expect(generateFileName(manifest100, 0)).toBe("test_001.png");
    expect(generateFileName(manifest100, 99)).toBe("test_100.png");
  });
});

describe("generateFragmentFileName", () => {
  const mockManifest = {
    config: { prefix: "img" },
    images: [{ name: "test1" }, { name: "test2" }, { name: "test3" }],
  } as ManifestData;

  test("should generate fragment file names", () => {
    expect(generateFragmentFileName(mockManifest, 0)).toBe(
      "img_1_fragmented.png",
    );
    expect(generateFragmentFileName(mockManifest, 1)).toBe(
      "img_2_fragmented.png",
    );
    expect(generateFragmentFileName(mockManifest, 2)).toBe(
      "img_3_fragmented.png",
    );
  });

  test("should handle different prefixes", () => {
    const customManifest = {
      config: { prefix: "custom" },
      images: [{ name: "test1" }],
    } as ManifestData;
    expect(generateFragmentFileName(customManifest, 0)).toBe(
      "custom_1_fragmented.png",
    );
  });
});

describe("generateRestoredFileName", () => {
  const mockManifest = {
    config: { prefix: "img" },
    images: [{ name: "test1" }, { name: "test2" }, { name: "test3" }],
  } as ManifestData;

  test("should generate restored file names", () => {
    expect(generateRestoredFileName(mockManifest, 0)).toBe("img_1.png");
    expect(generateRestoredFileName(mockManifest, 1)).toBe("img_2.png");
    expect(generateRestoredFileName(mockManifest, 2)).toBe("img_3.png");
  });

  test("should handle different manifest sizes", () => {
    const largeManifest = {
      config: { prefix: "large" },
      images: Array(50).fill({ name: "test" }),
    } as ManifestData;
    expect(generateRestoredFileName(largeManifest, 0)).toBe("large_01.png");
    expect(generateRestoredFileName(largeManifest, 49)).toBe("large_50.png");
  });
});

describe("encodeFileName / decodeFileName", () => {
  test("should encode and decode file names correctly", () => {
    const originalName = "test-image.png";
    const encoded = encodeFileName(originalName);
    expect(encoded).toBeTruthy();
    expect(encoded).not.toBe(originalName);
    expect(decodeFileName(encoded)).toBe(originalName);
  });

  test("should handle special characters", () => {
    const specialNames = [
      "画像_テスト.png",
      "test-image-日本語.png",
      "file with spaces.png",
      "file@#$%^&.png",
    ];
    for (const name of specialNames) {
      const encoded = encodeFileName(name);
      expect(decodeFileName(encoded)).toBe(name);
    }
  });
});

describe("generateRestoredOriginalFileName", () => {
  test("should generate original file name when name exists (base64 encoded)", () => {
    const originalName = "original";
    const encodedName = encodeFileName(originalName);
    const imageInfo = {
      name: encodedName,
    } as ManifestData["images"][number];
    expect(generateRestoredOriginalFileName(imageInfo)).toBe("original.png");
  });

  test("should handle backward compatibility (non-encoded names)", () => {
    const imageInfo = {
      name: "b3JpZ2luYWw=",
    } as ManifestData["images"][number];
    expect(generateRestoredOriginalFileName(imageInfo)).toBe("original.png");
  });

  test("should use provided format for extension", () => {
    const originalName = "original";
    const encodedName = encodeFileName(originalName);
    const imageInfo = {
      name: encodedName,
    } as ManifestData["images"][number];
    expect(generateRestoredOriginalFileName(imageInfo, "jpeg")).toBe(
      "original.jpg",
    );
    expect(generateRestoredOriginalFileName(imageInfo, "png")).toBe(
      "original.png",
    );
  });

  test("should handle format with backward compatibility fallback", () => {
    const imageInfo = {
      name: "b3JpZ2luYWw=",
    } as ManifestData["images"][number];
    expect(generateRestoredOriginalFileName(imageInfo, "jpeg")).toBe(
      "original.jpg",
    );
  });

  test("should return undefined when name is null or undefined", () => {
    expect(
      generateRestoredOriginalFileName(
        {
          name: null,
        } as unknown as ManifestData["images"][number],
      ),
    ).toBeUndefined();
    expect(
      generateRestoredOriginalFileName({
        name: undefined,
      } as ManifestData["images"][number]),
    ).toBeUndefined();
    expect(
      generateRestoredOriginalFileName({} as ManifestData["images"][number]),
    ).toBeUndefined();
  });

  test("should handle empty string name", () => {
    expect(
      generateRestoredOriginalFileName({
        name: "",
      } as ManifestData["images"][number]),
    ).toBeUndefined();
  });
});

describe("resolveJpegQuality", () => {
  test("should resolve preset quality values", () => {
    expect(resolveJpegQuality("low")).toBe(40);
    expect(resolveJpegQuality("normal")).toBe(75);
    expect(resolveJpegQuality("high")).toBe(90);
  });

  test("should return numeric values as-is within bounds", () => {
    expect(resolveJpegQuality(50)).toBe(50);
    expect(resolveJpegQuality(0)).toBe(0);
    expect(resolveJpegQuality(100)).toBe(100);
  });

  test("should clamp out-of-bound numeric values", () => {
    expect(resolveJpegQuality(-10)).toBe(0);
    expect(resolveJpegQuality(150)).toBe(100);
  });
});

describe("getImageFormatExtension", () => {
  test("should return correct extension for png", () => {
    expect(getImageFormatExtension("png")).toBe("png");
  });

  test("should return correct extension for jpeg", () => {
    expect(getImageFormatExtension("jpeg")).toBe("jpg");
  });
});

describe("generateFileName with format option", () => {
  const mockManifest = {
    config: { prefix: "img", output: {} },
    images: [{ name: "test1" }, { name: "test2" }],
  } as ManifestData;

  test("should default to png extension", () => {
    expect(generateFileName(mockManifest, 0)).toBe("img_1.png");
  });

  test("should use format option when provided", () => {
    expect(
      generateFileName(mockManifest, 0, {
        isFragmented: false,
        format: "jpeg",
      }),
    ).toBe("img_1.jpg");
    expect(
      generateFileName(mockManifest, 0, { isFragmented: true, format: "jpeg" }),
    ).toBe("img_1_fragmented.jpg");
  });

  test("should use manifest output format when no format option", () => {
    const jpegManifest = {
      config: { prefix: "img", output: { format: "jpeg" } },
      images: [{ name: "test1" }],
    } as ManifestData;
    expect(generateFileName(jpegManifest, 0)).toBe("img_1.jpg");
    expect(generateFileName(jpegManifest, 0, { isFragmented: true })).toBe(
      "img_1_fragmented.jpg",
    );
  });

  test("should prioritize format option over manifest output format", () => {
    const jpegManifest = {
      config: { prefix: "img", output: { format: "jpeg" } },
      images: [{ name: "test1" }],
    } as ManifestData;
    expect(
      generateFileName(jpegManifest, 0, { isFragmented: false, format: "png" }),
    ).toBe("img_1.png");
  });
});

describe("generateFragmentFileName with format", () => {
  const mockManifest = {
    config: { prefix: "img", output: {} },
    images: [{ name: "test1" }],
  } as ManifestData;

  test("should use provided format", () => {
    expect(generateFragmentFileName(mockManifest, 0, "jpeg")).toBe(
      "img_1_fragmented.jpg",
    );
    expect(generateFragmentFileName(mockManifest, 0, "png")).toBe(
      "img_1_fragmented.png",
    );
  });

  test("should default to manifest format when not provided", () => {
    const jpegManifest = {
      config: { prefix: "img", output: { format: "jpeg" } },
      images: [{ name: "test1" }],
    } as ManifestData;
    expect(generateFragmentFileName(jpegManifest, 0)).toBe(
      "img_1_fragmented.jpg",
    );
  });
});
