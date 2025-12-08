import {
  DEFAULT_FRAGMENTATION_CONFIG,
  IMAGE_FORMAT_EXTENSIONS,
  JPEG_QUALITY,
} from "./constants";
import type {
  ImageFormat,
  ImageInfo,
  JpegQuality,
  ManifestData,
} from "./types";

/**
 * Convert JpegQuality to numeric value (0-100)
 * @param quality Quality setting (preset name or number)
 * @returns Numeric quality value
 */
export function resolveJpegQuality(quality: JpegQuality): number {
  if (typeof quality === "number") {
    return Math.max(0, Math.min(100, quality));
  }
  return JPEG_QUALITY[quality];
}

/**
 * Get file extension for image format
 * @param format Image format
 * @returns File extension (without dot)
 */
export function getImageFormatExtension(format: ImageFormat): string {
  return IMAGE_FORMAT_EXTENSIONS[format];
}

/**
 * Create a minimal ManifestData for single image restoration
 * @param options - Options for the manifest
 * @param options.blockSize - Block size used for fragmentation
 * @param options.seed - Seed used for shuffling
 * @param options.imageInfo - Image information (width and height)
 * @returns ManifestData object
 */
export function createSingleImageManifest(options: {
  blockSize: number;
  seed: number;
  imageInfo: ImageInfo;
}): ManifestData {
  return {
    id: "manual",
    version: "0.0.0",
    timestamp: new Date().toISOString(),
    config: {
      blockSize: options.blockSize,
      seed: options.seed,
      prefix: DEFAULT_FRAGMENTATION_CONFIG.PREFIX,
      preserveName: false,
      crossImageShuffle: false,
      output: {},
    },
    images: [options.imageInfo],
  };
}

/**
 * Encode file name to base64 for safe storage (cross-platform)
 * @param name - Original file name
 * @returns Base64 encoded file name
 */
export function encodeFileName(name: string): string {
  // Use TextEncoder for UTF-8 encoding (available in both browser and Node.js)
  const encoder = new TextEncoder();
  const bytes = encoder.encode(name);
  // Convert bytes to binary string for btoa (cross-platform)
  // Use loop to avoid stack overflow with large arrays
  let binaryString = "";
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];
    binaryString += String.fromCharCode(byte);
  }
  return btoa(binaryString);
}

/**
 * Decode file name from base64 (cross-platform)
 * @param encodedName - Base64 encoded file name
 * @returns Decoded original file name
 */
export function decodeFileName(encodedName: string): string {
  // Use atob for base64 decoding (cross-platform)
  const binaryString = atob(encodedName);
  // Convert binary string to bytes
  const bytes = Uint8Array.from(binaryString, (c) => c.charCodeAt(0));
  // Use TextDecoder for UTF-8 decoding (available in both browser and Node.js)
  const decoder = new TextDecoder();
  return decoder.decode(bytes);
}

/**
 * Generate a file name with prefix, 1-based zero-padded index, and extension
 * @param manifest - Manifest data
 * @param index - Index number (0-based, but output is 1-based)
 * @param options - Options for the file name
 * @param options.isFragmented - Whether the fragment is fragmented
 * @param options.format - Image format (determines extension)
 * @returns File name (e.g., img_1.png or img_1.jpg)
 */
export function generateFileName(
  manifest: ManifestData,
  index: number,
  options: {
    isFragmented: boolean;
    format?: ImageFormat;
  } = {
    isFragmented: false,
  },
): string {
  const prefix = manifest.config.prefix;
  const totalLength = manifest.images.length;
  // Determine extension from format option or manifest config
  const format = options.format ?? manifest.config.output?.format ?? "png";
  const extension = IMAGE_FORMAT_EXTENSIONS[format];
  const numDigits = String(totalLength).length;
  const paddedIndex = String(index + 1).padStart(numDigits, "0");
  const filenameSuffix = options.isFragmented ? "_fragmented" : "";
  const filename = `${prefix}_${paddedIndex}${filenameSuffix}`;
  return `${filename}.${extension}`;
}

/**
 * Generate a fragment file name
 * @param manifest - Manifest data
 * @param index - Index number (0-based, but output is 1-based)
 * @param format - Optional image format override
 * @returns Fragment file name (e.g., img_1_fragmented.png or img_1_fragmented.jpg)
 */
export function generateFragmentFileName(
  manifest: ManifestData,
  index: number,
  format?: ImageFormat,
): string {
  return generateFileName(manifest, index, {
    isFragmented: true,
    format,
  });
}

/**
 * Generate a restored file name
 * @param manifest - Manifest data
 * @param index - Index number (0-based, but output is 1-based)
 * @returns Restored file name (e.g., img_1.png)
 */
export function generateRestoredFileName(
  manifest: ManifestData,
  index: number,
): string {
  return generateFileName(manifest, index, {
    isFragmented: false,
  });
}

/**
 * Generate a restored original file name
 * @param imageInfo - Image information
 * @returns Restored original file name
 */
export function generateRestoredOriginalFileName(
  imageInfo: ManifestData["images"][number],
): string | undefined {
  if (!imageInfo.name) {
    return undefined;
  }
  try {
    const decodedName = decodeFileName(imageInfo.name);
    return decodedName ? `${decodedName}.png` : undefined;
  } catch {
    // Fallback: if decoding fails, treat as already decoded (backward compatibility)
    return `${imageInfo.name}.png`;
  }
}
