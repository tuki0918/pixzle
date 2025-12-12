export const MANIFEST_FILE_NAME = "manifest.json";

export const DEFAULT_FRAGMENTATION_CONFIG = {
  BLOCK_SIZE: 8,
  PREFIX: "img",
  PRESERVE_NAME: false,
  CROSS_IMAGE_SHUFFLE: false,
};

/** JPEG quality presets (0-100) */
export const JPEG_QUALITY = {
  low: 40,
  normal: 75,
  high: 90,
} as const;

/** Default image output options */
export const DEFAULT_IMAGE_OUTPUT_OPTIONS = {
  FORMAT: "png" as const,
  CHANNELS: 4 as const,
  JPEG_QUALITY: "normal" as const,
  PNG_COMPRESSION_LEVEL: 6 as const, // zlib default
};

/** File extensions for image formats */
export const IMAGE_FORMAT_EXTENSIONS = {
  png: "png",
  jpeg: "jpg",
} as const;
