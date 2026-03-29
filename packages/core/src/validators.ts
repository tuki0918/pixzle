import { decodeFileName } from "./helpers";
import type { ImageInfo, ManifestData } from "./types";

function validateOptionsObject<T>(options: T, context: string): T {
  if (!options) {
    throw new Error(`[${context}] Options object is required.`);
  }

  return options;
}

/**
 * Validates that the number of fragment images matches the number of images in the manifest
 * @param fragmentImages - Array of fragment images (file paths or buffers)
 * @param manifest - The manifest data containing image information
 * @throws {Error} When the counts don't match
 */
export function validateFragmentImageCount(
  fragmentImages: { length: number },
  manifest: ManifestData,
): void {
  const manifestImageCount = manifest.images.length;
  const fragmentImageCount = fragmentImages.length;

  if (manifestImageCount !== fragmentImageCount) {
    throw new Error(
      `Fragment image count mismatch: expected ${manifestImageCount} but got ${fragmentImageCount}`,
    );
  }
}

export function validateOptionsWithImages<T extends { images: unknown }>(
  options: T,
  context: string,
): T {
  validateOptionsObject(options, context);

  if (!Array.isArray(options.images) || options.images.length === 0) {
    throw new Error(`[${context}] images must be a non-empty array.`);
  }

  return options;
}

export function validateOutputDirectoryOption<
  T extends { outputDir?: unknown },
>(options: T, context: string): T {
  validateOptionsObject(options, context);

  if (typeof options.outputDir !== "string" || options.outputDir.length === 0) {
    throw new Error(`[${context}] outputDir is required and must be a string.`);
  }

  return options;
}

export function validateManifestOptions<
  T extends { manifest?: unknown; manifestData?: ManifestData },
>(options: T, context: string): T {
  validateOptionsObject(options, context);

  if (!options.manifest && !options.manifestData) {
    throw new Error(
      `[${context}] Either manifest or manifestData is required.`,
    );
  }

  if (options.manifest !== undefined && typeof options.manifest !== "string") {
    throw new Error(`[${context}] manifest must be a string.`);
  }

  return options;
}

export function validateRestoreImageOptions<
  T extends {
    image?: unknown;
    blockSize?: unknown;
    seed?: unknown;
    imageInfo?: ImageInfo;
  },
>(options: T, context: string): T {
  validateOptionsObject(options, context);

  if (!options.image) {
    throw new Error(`[${context}] image is required.`);
  }

  if (typeof options.blockSize !== "number" || options.blockSize <= 0) {
    throw new Error(`[${context}] blockSize must be a positive number.`);
  }

  if (typeof options.seed !== "string") {
    throw new Error(`[${context}] seed must be a string.`);
  }

  if (
    !options.imageInfo ||
    typeof options.imageInfo.w !== "number" ||
    typeof options.imageInfo.h !== "number"
  ) {
    throw new Error(`[${context}] imageInfo with valid w and h is required.`);
  }

  return options;
}

/**
 * Validates that there are no duplicate file names in the image infos
 * @param imageInfos - Array of image information objects
 * @param preserveName - Whether name preservation is enabled
 * @throws {Error} When duplicate file names are detected
 */
export function validateFileNames(
  imageInfos: ImageInfo[],
  preserveName: boolean,
): void {
  if (!preserveName || imageInfos.length <= 1) {
    return;
  }

  const nameSet = new Set<string>();

  for (const info of imageInfos) {
    if (info.name !== undefined) {
      // Decode base64 to get original name for comparison
      let decodedName: string;
      try {
        decodedName = decodeFileName(info.name);
      } catch {
        // If decoding fails, treat as already decoded (backward compatibility)
        decodedName = info.name;
      }
      if (nameSet.has(decodedName)) {
        throw new Error(`Duplicate file name detected: ${decodedName}`);
      }
      nameSet.add(decodedName);
    }
  }
}
