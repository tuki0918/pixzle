import fs from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { ImageFragmenter } from "./fragmenter";
import { ImageRestorer } from "./restorer";

async function readPngToRgba(input: string | Buffer): Promise<{
  data: Buffer;
  width: number;
  height: number;
}> {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

describe("ImageRestorer", () => {
  const tmpDir = path.join(tmpdir(), "restorer_test_tmp");
  let testImagePath: string;
  let originalImageData: Buffer;

  beforeAll(async () => {
    // Create tmp directory and test image
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

    // Create a simple 4x4 RGBA test image
    originalImageData = Buffer.from([
      // Row 1
      255,
      0,
      0,
      255, // Red
      0,
      255,
      0,
      255, // Green
      0,
      0,
      255,
      255, // Blue
      255,
      255,
      0,
      255, // Yellow
      // Row 2
      255,
      0,
      255,
      255, // Magenta
      0,
      255,
      255,
      255, // Cyan
      128,
      128,
      128,
      255, // Gray
      255,
      255,
      255,
      255, // White
      // Row 3
      0,
      0,
      0,
      255, // Black
      64,
      64,
      64,
      255, // Dark gray
      192,
      192,
      192,
      255, // Light gray
      255,
      128,
      0,
      255, // Orange
      // Row 4
      128,
      0,
      128,
      255, // Purple
      0,
      128,
      0,
      255, // Dark green
      0,
      0,
      128,
      255, // Dark blue
      128,
      128,
      0,
      255, // Olive
    ]);

    testImagePath = path.join(tmpDir, "test_image.png");
    await sharp(originalImageData, {
      raw: { width: 4, height: 4, channels: 4 },
    })
      .png()
      .toFile(testImagePath);
  });

  afterAll(() => {
    // Clean up tmp files
    if (fs.existsSync(testImagePath)) fs.unlinkSync(testImagePath);
    if (fs.existsSync(tmpDir)) fs.rmdirSync(tmpDir);
  });

  describe("constructor", () => {
    test("initializes successfully", () => {
      const restorer = new ImageRestorer();
      expect(restorer).toBeInstanceOf(ImageRestorer);
    });
  });

  describe("restoreImages", () => {
    test("restores single image", async () => {
      // First fragment the image
      const fragmenter = new ImageFragmenter({
        blockSize: 2,
        seed: 12345,
      });
      const { manifest, fragmentedImages } = await fragmenter.fragmentImages([
        testImagePath,
      ]);

      // Then restore it
      const restorer = new ImageRestorer();
      const restoredImages = await restorer.restoreImages(
        fragmentedImages,
        manifest,
      );

      expect(restoredImages).toHaveLength(1);
      expect(Buffer.isBuffer(restoredImages[0])).toBe(true);

      // Should be able to read as PNG
      const meta = await sharp(restoredImages[0]).metadata();
      expect(meta.format).toBe("png");
      expect(meta.width).toBe(4);
      expect(meta.height).toBe(4);
    });

    test("restores multiple images", async () => {
      // First fragment multiple images
      const fragmenter = new ImageFragmenter({
        blockSize: 2,
        seed: 12345,
      });
      const { manifest, fragmentedImages } = await fragmenter.fragmentImages([
        testImagePath,
        testImagePath,
      ]);

      // Then restore them
      const restorer = new ImageRestorer();
      const restoredImages = await restorer.restoreImages(
        fragmentedImages,
        manifest,
      );

      expect(restoredImages).toHaveLength(2);
      for (const restoredImage of restoredImages) {
        expect(Buffer.isBuffer(restoredImage)).toBe(true);

        const meta = await sharp(restoredImage).metadata();
        expect(meta.format).toBe("png");
        expect(meta.width).toBe(4);
        expect(meta.height).toBe(4);
      }
    });

    test("restores image with different block sizes", async () => {
      const blockSize = 1;

      // Fragment with block size 1
      const fragmenter = new ImageFragmenter({
        blockSize,
        seed: 12345,
      });
      const { manifest, fragmentedImages } = await fragmenter.fragmentImages([
        testImagePath,
      ]);

      // Restore
      const restorer = new ImageRestorer();
      const restoredImages = await restorer.restoreImages(
        fragmentedImages,
        manifest,
      );

      expect(restoredImages).toHaveLength(1);
      const meta = await sharp(restoredImages[0]).metadata();
      expect(meta.width).toBe(4);
      expect(meta.height).toBe(4);
    });

    test("accepts fragment images as file paths", async () => {
      // First fragment and save to files
      const fragmenter = new ImageFragmenter({
        blockSize: 2,
        seed: 12345,
      });
      const { manifest, fragmentedImages } = await fragmenter.fragmentImages([
        testImagePath,
      ]);

      // Save fragment images to temporary files
      const fragmentPaths: string[] = [];
      for (let i = 0; i < fragmentedImages.length; i++) {
        const fragmentPath = path.join(tmpDir, `fragment_${i}.png`);
        fs.writeFileSync(fragmentPath, fragmentedImages[i]);
        fragmentPaths.push(fragmentPath);
      }

      // Restore using file paths
      const restorer = new ImageRestorer();
      const restoredImages = await restorer.restoreImages(
        fragmentPaths,
        manifest,
      );

      expect(restoredImages).toHaveLength(1);

      // Clean up fragment files
      for (const fragmentPath of fragmentPaths) {
        if (fs.existsSync(fragmentPath)) fs.unlinkSync(fragmentPath);
      }
    });

    test("accepts mixed fragment images (buffers and paths)", async () => {
      // First fragment
      const fragmenter = new ImageFragmenter({
        blockSize: 2,
        seed: 12345,
      });
      const { manifest, fragmentedImages } = await fragmenter.fragmentImages([
        testImagePath,
        testImagePath,
      ]);

      // Save one fragment to file, keep one as buffer
      const fragmentPath = path.join(tmpDir, "fragment_mixed.png");
      fs.writeFileSync(fragmentPath, fragmentedImages[0]);

      const mixedFragments = [fragmentPath, fragmentedImages[1]];

      // Restore using mixed inputs
      const restorer = new ImageRestorer();
      const restoredImages = await restorer.restoreImages(
        mixedFragments,
        manifest,
      );

      expect(restoredImages).toHaveLength(2);

      // Clean up
      if (fs.existsSync(fragmentPath)) fs.unlinkSync(fragmentPath);
    });

    test("round-trip restoration preserves image data", async () => {
      // Use a deterministic seed for consistent results
      const fragmenter = new ImageFragmenter({
        blockSize: 1, // Use block size 1 for pixel-perfect restoration
        seed: 99999,
      });

      const { manifest, fragmentedImages } = await fragmenter.fragmentImages([
        testImagePath,
      ]);

      const restorer = new ImageRestorer();
      const restoredImages = await restorer.restoreImages(
        fragmentedImages,
        manifest,
      );

      // Compare the restored image data with original
      const original = await readPngToRgba(testImagePath);
      const restored = await readPngToRgba(restoredImages[0]);

      expect(restored.width).toBe(original.width);
      expect(restored.height).toBe(original.height);
      expect(restored.data.length).toBe(original.data.length);
      expect(restored.data).toEqual(original.data);
    });
  });

  describe("error handling", () => {
    test("handles non-existent fragment file", async () => {
      const fragmenter = new ImageFragmenter({
        blockSize: 2,
        seed: 12345,
      });
      const { manifest } = await fragmenter.fragmentImages([testImagePath]);

      const restorer = new ImageRestorer();
      const nonExistentPath = path.join(tmpDir, "nonexistent.png");

      await expect(
        restorer.restoreImages([nonExistentPath], manifest),
      ).rejects.toThrow();
    });

    test("handles invalid fragment file", async () => {
      const fragmenter = new ImageFragmenter({
        blockSize: 2,
        seed: 12345,
      });
      const { manifest } = await fragmenter.fragmentImages([testImagePath]);

      const invalidFragmentPath = path.join(tmpDir, "invalid_fragment.png");
      fs.writeFileSync(invalidFragmentPath, "not an image");

      const restorer = new ImageRestorer();

      try {
        await expect(
          restorer.restoreImages([invalidFragmentPath], manifest),
        ).rejects.toThrow();
      } finally {
        if (fs.existsSync(invalidFragmentPath))
          fs.unlinkSync(invalidFragmentPath);
      }
    });
  });

  describe("integration with different configurations", () => {
    test("works with preserveName enabled", async () => {
      const fragmenter = new ImageFragmenter({
        blockSize: 2,
        seed: 12345,
        preserveName: true,
      });
      const { manifest, fragmentedImages } = await fragmenter.fragmentImages([
        testImagePath,
      ]);

      const restorer = new ImageRestorer();
      const restoredImages = await restorer.restoreImages(
        fragmentedImages,
        manifest,
      );

      expect(restoredImages).toHaveLength(1);
      expect(manifest.images[0].name).toBe("dGVzdF9pbWFnZQ==");
    });

    test("works with custom prefix", async () => {
      const fragmenter = new ImageFragmenter({
        blockSize: 2,
        seed: 12345,
        prefix: "custom-prefix",
      });
      const { manifest, fragmentedImages } = await fragmenter.fragmentImages([
        testImagePath,
      ]);

      const restorer = new ImageRestorer();
      const restoredImages = await restorer.restoreImages(
        fragmentedImages,
        manifest,
      );

      expect(restoredImages).toHaveLength(1);
      expect(manifest.config.prefix).toBe("custom-prefix");
    });
  });

  describe("crossImageShuffle restoration", () => {
    test("restores single image with per-image shuffle (default)", async () => {
      const fragmenter = new ImageFragmenter({
        blockSize: 2,
        seed: 12345,
      });
      const { manifest, fragmentedImages } = await fragmenter.fragmentImages([
        testImagePath,
      ]);

      const restorer = new ImageRestorer();
      const restoredImages = await restorer.restoreImages(
        fragmentedImages,
        manifest,
      );

      expect(restoredImages).toHaveLength(1);
      expect(manifest.config.crossImageShuffle).toBe(false);

      const meta = await sharp(restoredImages[0]).metadata();
      expect(meta.width).toBe(4);
      expect(meta.height).toBe(4);
    });

    test("restores multiple images with per-image shuffle (default)", async () => {
      const fragmenter = new ImageFragmenter({
        blockSize: 2,
        seed: 12345,
      });
      const { manifest, fragmentedImages } = await fragmenter.fragmentImages([
        testImagePath,
        testImagePath,
      ]);

      const restorer = new ImageRestorer();
      const restoredImages = await restorer.restoreImages(
        fragmentedImages,
        manifest,
      );

      expect(restoredImages).toHaveLength(2);
      expect(manifest.config.crossImageShuffle).toBe(false);

      for (const restoredImage of restoredImages) {
        const meta = await sharp(restoredImage).metadata();
        expect(meta.width).toBe(4);
        expect(meta.height).toBe(4);
      }
    });

    test("round-trip with per-image shuffle preserves image data", async () => {
      const fragmenter = new ImageFragmenter({
        blockSize: 1,
        seed: 99999,
        crossImageShuffle: false,
      });

      const { manifest, fragmentedImages } = await fragmenter.fragmentImages([
        testImagePath,
      ]);

      const restorer = new ImageRestorer();
      const restoredImages = await restorer.restoreImages(
        fragmentedImages,
        manifest,
      );

      const original = await readPngToRgba(testImagePath);
      const restored = await readPngToRgba(restoredImages[0]);
      expect(restored.width).toBe(original.width);
      expect(restored.height).toBe(original.height);
      expect(restored.data).toEqual(original.data);
    });

    test("round-trip with multiple images and per-image shuffle", async () => {
      const fragmenter = new ImageFragmenter({
        blockSize: 1,
        seed: 99999,
        crossImageShuffle: false,
      });

      const { manifest, fragmentedImages } = await fragmenter.fragmentImages([
        testImagePath,
        testImagePath,
      ]);

      const restorer = new ImageRestorer();
      const restoredImages = await restorer.restoreImages(
        fragmentedImages,
        manifest,
      );

      expect(restoredImages).toHaveLength(2);

      const original = await readPngToRgba(testImagePath);
      for (const restoredImage of restoredImages) {
        const restored = await readPngToRgba(restoredImage);
        expect(restored.width).toBe(original.width);
        expect(restored.height).toBe(original.height);
        expect(restored.data).toEqual(original.data);
      }
    });

    test("round-trip with different-sized images and per-image shuffle", async () => {
      // Create test images of different sizes
      const smallImagePath = path.join(tmpDir, "small_restore_test.png");
      const largeImagePath = path.join(tmpDir, "large_restore_test.png");

      // Create 2x2 image
      const smallImageData = Buffer.from([
        255,
        0,
        0,
        255, // Red
        0,
        255,
        0,
        255, // Green
        0,
        0,
        255,
        255, // Blue
        255,
        255,
        0,
        255, // Yellow
      ]);
      await sharp(smallImageData, { raw: { width: 2, height: 2, channels: 4 } })
        .png()
        .toFile(smallImagePath);

      // Create 6x6 image
      const largeImageData = Buffer.alloc(6 * 6 * 4);
      for (let i = 0; i < 6 * 6 * 4; i += 4) {
        largeImageData[i] = 128; // R
        largeImageData[i + 1] = 128; // G
        largeImageData[i + 2] = 128; // B
        largeImageData[i + 3] = 255; // A
      }
      await sharp(largeImageData, { raw: { width: 6, height: 6, channels: 4 } })
        .png()
        .toFile(largeImagePath);

      try {
        const fragmenter = new ImageFragmenter({
          blockSize: 2,
          seed: 99999,
          crossImageShuffle: false,
        });

        const { manifest, fragmentedImages } = await fragmenter.fragmentImages([
          smallImagePath,
          largeImagePath,
        ]);

        const restorer = new ImageRestorer();
        const restoredImages = await restorer.restoreImages(
          fragmentedImages,
          manifest,
        );

        expect(restoredImages).toHaveLength(2);

        // Verify restored dimensions match originals
        const metaSmall = await sharp(restoredImages[0]).metadata();
        const metaLarge = await sharp(restoredImages[1]).metadata();

        expect(metaSmall.width).toBe(2);
        expect(metaSmall.height).toBe(2);
        expect(metaLarge.width).toBe(6);
        expect(metaLarge.height).toBe(6);
      } finally {
        // Clean up
        if (fs.existsSync(smallImagePath)) fs.unlinkSync(smallImagePath);
        if (fs.existsSync(largeImagePath)) fs.unlinkSync(largeImagePath);
      }
    });

    test("restores single image with cross-image shuffle", async () => {
      const fragmenter = new ImageFragmenter({
        blockSize: 2,
        seed: 12345,
        crossImageShuffle: true,
      });
      const { manifest, fragmentedImages } = await fragmenter.fragmentImages([
        testImagePath,
      ]);

      const restorer = new ImageRestorer();
      const restoredImages = await restorer.restoreImages(
        fragmentedImages,
        manifest,
      );

      expect(restoredImages).toHaveLength(1);
      expect(manifest.config.crossImageShuffle).toBe(true);

      const meta = await sharp(restoredImages[0]).metadata();
      expect(meta.width).toBe(4);
      expect(meta.height).toBe(4);
    });

    test("restores multiple images with cross-image shuffle", async () => {
      const fragmenter = new ImageFragmenter({
        blockSize: 2,
        seed: 12345,
        crossImageShuffle: true,
      });
      const { manifest, fragmentedImages } = await fragmenter.fragmentImages([
        testImagePath,
        testImagePath,
      ]);

      const restorer = new ImageRestorer();
      const restoredImages = await restorer.restoreImages(
        fragmentedImages,
        manifest,
      );

      expect(restoredImages).toHaveLength(2);
      expect(manifest.config.crossImageShuffle).toBe(true);

      for (const restoredImage of restoredImages) {
        const meta = await sharp(restoredImage).metadata();
        expect(meta.width).toBe(4);
        expect(meta.height).toBe(4);
      }
    });

    test("round-trip with cross-image shuffle preserves image data", async () => {
      const fragmenter = new ImageFragmenter({
        blockSize: 1,
        seed: 99999,
        crossImageShuffle: true,
      });

      const { manifest, fragmentedImages } = await fragmenter.fragmentImages([
        testImagePath,
      ]);

      const restorer = new ImageRestorer();
      const restoredImages = await restorer.restoreImages(
        fragmentedImages,
        manifest,
      );

      const original = await readPngToRgba(testImagePath);
      const restored = await readPngToRgba(restoredImages[0]);

      expect(restored.width).toBe(original.width);
      expect(restored.height).toBe(original.height);
      expect(restored.data).toEqual(original.data);
    });

    test("round-trip with multiple images and cross-image shuffle", async () => {
      const fragmenter = new ImageFragmenter({
        blockSize: 1,
        seed: 99999,
        crossImageShuffle: true,
      });

      const { manifest, fragmentedImages } = await fragmenter.fragmentImages([
        testImagePath,
        testImagePath,
      ]);

      const restorer = new ImageRestorer();
      const restoredImages = await restorer.restoreImages(
        fragmentedImages,
        manifest,
      );

      expect(restoredImages).toHaveLength(2);

      const original = await readPngToRgba(testImagePath);
      for (const restoredImage of restoredImages) {
        const restored = await readPngToRgba(restoredImage);
        expect(restored.width).toBe(original.width);
        expect(restored.height).toBe(original.height);
        expect(restored.data).toEqual(original.data);
      }
    });

    test("round-trip with different-sized images and cross-image shuffle", async () => {
      // Create test images of different sizes
      const smallImagePath = path.join(tmpDir, "small_cross_restore_test.png");
      const largeImagePath = path.join(tmpDir, "large_cross_restore_test.png");

      // Create 2x2 image
      const smallImageData = Buffer.from([
        255,
        0,
        0,
        255, // Red
        0,
        255,
        0,
        255, // Green
        0,
        0,
        255,
        255, // Blue
        255,
        255,
        0,
        255, // Yellow
      ]);
      await sharp(smallImageData, { raw: { width: 2, height: 2, channels: 4 } })
        .png()
        .toFile(smallImagePath);

      // Create 6x6 image
      const largeImageData = Buffer.alloc(6 * 6 * 4);
      for (let i = 0; i < 6 * 6 * 4; i += 4) {
        largeImageData[i] = 128; // R
        largeImageData[i + 1] = 128; // G
        largeImageData[i + 2] = 128; // B
        largeImageData[i + 3] = 255; // A
      }
      await sharp(largeImageData, { raw: { width: 6, height: 6, channels: 4 } })
        .png()
        .toFile(largeImagePath);

      try {
        const fragmenter = new ImageFragmenter({
          blockSize: 2,
          seed: 99999,
          crossImageShuffle: true,
        });

        const { manifest, fragmentedImages } = await fragmenter.fragmentImages([
          smallImagePath,
          largeImagePath,
        ]);

        const restorer = new ImageRestorer();
        const restoredImages = await restorer.restoreImages(
          fragmentedImages,
          manifest,
        );

        expect(restoredImages).toHaveLength(2);
        expect(manifest.config.crossImageShuffle).toBe(true);

        // Verify restored dimensions match originals
        const metaSmall = await sharp(restoredImages[0]).metadata();
        const metaLarge = await sharp(restoredImages[1]).metadata();

        expect(metaSmall.width).toBe(2);
        expect(metaSmall.height).toBe(2);
        expect(metaLarge.width).toBe(6);
        expect(metaLarge.height).toBe(6);
      } finally {
        // Clean up
        if (fs.existsSync(smallImagePath)) fs.unlinkSync(smallImagePath);
        if (fs.existsSync(largeImagePath)) fs.unlinkSync(largeImagePath);
      }
    });
  });
});
