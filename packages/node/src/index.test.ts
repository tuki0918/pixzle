import fs from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { ManifestData } from "@pixzle/core";
import {
  decodeFileName,
  generateFragmentFileName,
  generateRestoredFileName,
} from "@pixzle/core";
import { VERSION } from "./constants";
import { ImageFragmenter } from "./fragmenter";
import { decodeImage, writePngFile } from "./image-codec";
import pixzle from "./index";

async function expectPngImage(input: string | Buffer) {
  const image = await decodeImage(input);
  expect(image.format).toBe("png");
  return image;
}

describe("pixzle (integration)", () => {
  // Use OS temp directory for test files
  const tmpDir = path.join(tmpdir(), "index_test_tmp");
  const originalImages = [
    Buffer.from([
      // 2x2 RGBA image 1
      255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 0, 255,
    ]),
    Buffer.from([
      // 2x2 RGBA image 2
      0, 0, 0, 255, 128, 128, 128, 255, 255, 255, 255, 255, 64, 64, 64, 255,
    ]),
  ];
  const width = 2;
  const height = 2;
  const blockSize = 1;
  const prefix = "indextestimg";
  let testImagePaths: string[] = [];
  let manifestPath = "";
  let fragmentPaths: string[] = [];
  let restoredPaths: string[] = [];

  beforeAll(async () => {
    // Create tmp directory and save original images as PNG
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);
    testImagePaths = [];
    for (let i = 0; i < originalImages.length; i++) {
      const filePath = path.join(tmpDir, `original_${i}.png`);
      await writePngFile(filePath, originalImages[i], width, height);
      testImagePaths.push(filePath);
    }
    // Fragment images using pixzle.shuffle
    const manifest = await pixzle.shuffle({
      images: testImagePaths,
      config: { blockSize, prefix },
      outputDir: tmpDir,
    });
    expect(manifest).toBeDefined();
    expect(manifest.version).toBe(VERSION);

    // Find manifest and fragment files
    manifestPath = path.join(tmpDir, "manifest.json");
    fragmentPaths = [];
    for (let i = 0; i < originalImages.length; i++) {
      const manifestDataForFragment = {
        version: VERSION,
        config: { prefix },
        images: new Array(originalImages.length).fill({
          name: `original_${i}.png`,
        }),
      } as unknown as ManifestData;
      fragmentPaths.push(
        path.join(tmpDir, generateFragmentFileName(manifestDataForFragment, i)),
      );
    }
    // Restore images using pixzle.restore
    await pixzle.restore({
      images: fragmentPaths,
      manifest: manifestPath,
      outputDir: tmpDir,
    });
    // Find restored images (use the same logic as index.ts, based on fragmentPaths)
    restoredPaths = [];
    for (let i = 0; i < fragmentPaths.length; i++) {
      restoredPaths.push(
        path.join(
          tmpDir,
          generateRestoredFileName(
            {
              config: { prefix },
              images: new Array(originalImages.length).fill({
                name: `original_${i}.png`,
              }),
            } as unknown as ManifestData,
            i,
          ),
        ),
      );
    }
  });

  afterAll(() => {
    // Clean up tmp files
    for (const f of [
      ...testImagePaths,
      ...fragmentPaths,
      ...restoredPaths,
      manifestPath,
    ]) {
      if (f && fs.existsSync(f)) fs.unlinkSync(f);
    }
    if (fs.existsSync(tmpDir)) fs.rmdirSync(tmpDir);
  });

  test("restored images match original images", async () => {
    // Check that manifest.json exists
    expect(fs.existsSync(manifestPath)).toBe(true);

    // Check that fragment images exist and are valid PNGs
    for (const fragmentPath of fragmentPaths) {
      expect(fs.existsSync(fragmentPath)).toBe(true);
      // Should be openable as PNG
      const image = await expectPngImage(fragmentPath);
      expect(image.width).toBeGreaterThan(0);
      expect(image.height).toBeGreaterThan(0);
    }

    // Check that restored images exist before comparing content
    for (const restoredPath of restoredPaths) {
      expect(fs.existsSync(restoredPath)).toBe(true);
    }

    // Check that restored images match original images
    for (let i = 0; i < originalImages.length; i++) {
      const orig = await decodeImage(testImagePaths[i]);
      const restored = await decodeImage(restoredPaths[i]);
      expect(restored.imageBuffer).toEqual(orig.imageBuffer);
    }
  });
});

describe("pixzle (preserveName integration)", () => {
  const tmpDir = path.join(tmpdir(), "index_test_tmp_preserveName");
  const originalImages = [
    Buffer.from([
      // 2x2 RGBA image 1
      255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 0, 255,
    ]),
    Buffer.from([
      // 2x2 RGBA image 2
      0, 0, 0, 255, 128, 128, 128, 255, 255, 255, 255, 255, 64, 64, 64, 255,
    ]),
  ];
  const width = 2;
  const height = 2;
  const blockSize = 1;
  const prefix = "indextestimgorig";
  let testImagePaths: string[] = [];
  let manifestPath = "";
  let fragmentPaths: string[] = [];
  let restoredPaths: string[] = [];
  let manifest: ManifestData | null = null;

  beforeAll(async () => {
    // Create tmp directory and save original images as PNG
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);
    testImagePaths = [];
    for (let i = 0; i < originalImages.length; i++) {
      const filePath = path.join(tmpDir, `original_${i}.png`);
      await writePngFile(filePath, originalImages[i], width, height);
      testImagePaths.push(filePath);
    }
    // Fragment images using pixzle.shuffle (with preserveName)
    await pixzle.shuffle({
      images: testImagePaths,
      config: { blockSize, prefix, preserveName: true },
      outputDir: tmpDir,
    });
    // Find manifest and fragment files
    manifestPath = path.join(tmpDir, "manifest.json");
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    fragmentPaths = [];

    if (!manifest) {
      throw new Error("Manifest is not defined");
    }

    for (let i = 0; i < originalImages.length; i++) {
      fragmentPaths.push(
        path.join(tmpDir, generateFragmentFileName(manifest, i)),
      );
    }
    // Restore images using pixzle.restore
    await pixzle.restore({
      images: fragmentPaths,
      manifest: manifestPath,
      outputDir: tmpDir,
    });
    // Find restored images (should be named as original file name)
    restoredPaths = [];
    for (let i = 0; i < testImagePaths.length; i++) {
      const origName = path.parse(testImagePaths[i]).name;
      restoredPaths.push(path.join(tmpDir, `${origName}.png`));
    }
  });

  afterAll(() => {
    for (const f of [
      ...testImagePaths,
      ...fragmentPaths,
      ...restoredPaths,
      manifestPath,
    ]) {
      if (f && fs.existsSync(f)) fs.unlinkSync(f);
    }
    if (fs.existsSync(tmpDir)) fs.rmdirSync(tmpDir);
  });

  test("manifest images[].name contains original file name when preserveName=true", () => {
    expect(manifest).toBeDefined();
    expect(manifest?.config.preserveName).toBe(true);
    expect(Array.isArray(manifest?.images)).toBe(true);
    for (let i = 0; i < testImagePaths.length; i++) {
      const expectedName = path.parse(testImagePaths[i]).name;
      const encodedName = manifest?.images[i]?.name;
      expect(encodedName).toBeTruthy();
      // Decode base64 encoded name
      if (encodedName) {
        const decodedName = decodeFileName(encodedName);
        expect(decodedName).toBe(expectedName);
      }
    }
  });

  test("restored file names are original file names (with .png)", () => {
    for (let i = 0; i < testImagePaths.length; i++) {
      const origName = path.parse(testImagePaths[i]).name;
      const restoredPath = path.join(tmpDir, `${origName}.png`);
      expect(fs.existsSync(restoredPath)).toBe(true);
    }
  });
});

describe("pixzle (error handling)", () => {
  const tmpDir = path.join(tmpdir(), "index_test_tmp_error_handling");
  let testImagePath: string;

  beforeAll(async () => {
    // Create tmp directory and test image
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

    // Create a simple 2x2 RGBA test image
    const imageData = Buffer.from([
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

    testImagePath = path.join(tmpDir, "test_image.png");
    await writePngFile(testImagePath, imageData, 2, 2);
  });

  afterAll(() => {
    // Clean up tmp files
    if (fs.existsSync(testImagePath)) fs.unlinkSync(testImagePath);
    if (fs.existsSync(tmpDir)) fs.rmdirSync(tmpDir);
  });

  test("throws error when fragment count doesn't match manifest", async () => {
    // First fragment multiple images
    const fragmenter = new ImageFragmenter({
      blockSize: 1,
      seed: "12345",
    });
    const { manifest, fragmentedImages } = await fragmenter.fragmentImages([
      testImagePath,
      testImagePath,
    ]);

    // Save manifest to file
    const manifestPath = path.join(tmpDir, "manifest.json");
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

    // Save only one fragment (should have 2)
    const fragmentPath = path.join(tmpDir, "fragment_0.png");
    fs.writeFileSync(fragmentPath, fragmentedImages[0]);

    try {
      // Try to restore with wrong number of fragments
      await expect(
        pixzle.restore({
          images: [fragmentPath],
          manifest: manifestPath,
          outputDir: tmpDir,
        }),
      ).rejects.toThrow("Fragment image count mismatch");
    } finally {
      // Clean up
      if (fs.existsSync(manifestPath)) fs.unlinkSync(manifestPath);
      if (fs.existsSync(fragmentPath)) fs.unlinkSync(fragmentPath);
    }
  });
});

describe("pixzle thumbnails", () => {
  const tmpDir = path.join(tmpdir(), "index_test_tmp_thumbnails");
  const outputDir = path.join(tmpDir, "output");
  const imagePath = path.join(tmpDir, "wide.png");

  beforeAll(async () => {
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

    const imageData = Buffer.alloc(20 * 10 * 4);
    for (let i = 0; i < imageData.length; i += 4) {
      imageData[i] = 255;
      imageData[i + 1] = 0;
      imageData[i + 2] = 0;
      imageData[i + 3] = 255;
    }

    await writePngFile(imagePath, imageData, 20, 10);
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("writes thumbnails from original images using the requested square bound", async () => {
    const manifest = await pixzle.shuffle({
      images: [imagePath],
      config: { blockSize: 2, prefix: "thumbtest", seed: "thumb-seed" },
      outputDir,
      thumbnail: true,
      thumbnailSize: 5,
    });

    expect(manifest.artifacts?.thumbnails).toEqual({
      enabled: true,
      size: 5,
      directory: "thumbnails",
    });

    const manifestPath = path.join(outputDir, "manifest.json");
    const writtenManifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    expect(writtenManifest.artifacts?.thumbnails).toEqual({
      enabled: true,
      size: 5,
      directory: "thumbnails",
    });

    const thumbnailPath = path.join(
      outputDir,
      "thumbnails",
      "thumbtest_1_thumbnail.png",
    );
    expect(fs.existsSync(thumbnailPath)).toBe(true);

    const thumbnail = await expectPngImage(thumbnailPath);
    expect(thumbnail.width).toBe(5);
    expect(thumbnail.height).toBe(3);
  });

  test("does not write thumbnail artifacts when thumbnails are disabled", async () => {
    const noThumbnailOutputDir = path.join(tmpDir, "output-no-thumbnail");

    const manifest = await pixzle.shuffle({
      images: [imagePath],
      config: { blockSize: 2, prefix: "nothumb", seed: "thumb-seed" },
      outputDir: noThumbnailOutputDir,
    });

    expect(manifest.artifacts).toBeUndefined();
  });
});
