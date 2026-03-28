import {
  validateManifestOptions,
  validateOptionsWithImages,
  validateOutputDirectoryOption,
  validateRestoreImageOptions,
} from "./validators";

describe("validators", () => {
  test("validateOptionsWithImages accepts non-empty arrays", () => {
    const options = { images: ["a"] };
    expect(validateOptionsWithImages(options, "test")).toBe(options);
  });

  test("validateOptionsWithImages rejects empty arrays", () => {
    expect(() => validateOptionsWithImages({ images: [] }, "test")).toThrow(
      "[test] images must be a non-empty array.",
    );
  });

  test("validateOutputDirectoryOption requires outputDir", () => {
    expect(() =>
      validateOutputDirectoryOption({ outputDir: "" }, "test"),
    ).toThrow("[test] outputDir is required and must be a string.");
  });

  test("validateManifestOptions requires manifest or manifestData", () => {
    expect(() => validateManifestOptions({}, "restore")).toThrow(
      "[restore] Either manifest or manifestData is required.",
    );
  });

  test("validateRestoreImageOptions validates single-image restore input", () => {
    const options = {
      image: "image.png",
      blockSize: 8,
      seed: 123,
      imageInfo: { w: 10, h: 10 },
    };

    expect(validateRestoreImageOptions(options, "restoreImage")).toBe(options);
  });
});
