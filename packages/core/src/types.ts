export interface ShuffleOptions {
  /** Image sources - file paths or URLs (e.g., ["image1.png", "https://example.com/image2.png"]) */
  images: string[];
  /** Fragmentation config */
  config?: FragmentationConfig;
  /** Output directory (e.g., "./output/fragments") */
  outputDir: string;
}

export interface RestoreOptions {
  /** Image sources - file paths or URLs (e.g., ["fragment1.png", "https://example.com/fragment2.png"]) */
  images: string[];
  /** Manifest source - file path or URL (e.g., "./manifest.json" or "https://example.com/manifest.json") */
  manifest?: string;
  /** Manifest data object (alternative to manifest) */
  manifestData?: ManifestData;
  /** Output directory (e.g., "./output/restored") */
  outputDir: string;
}

export interface FragmentationConfig {
  /**
   * Pixel block size (e.g., 10x10 to 10)
   * Smaller -> High Obfuscation / Larger -> High Performance
   */
  blockSize?: number;
  /** Prefix for fragment files (optional, default: "img") */
  prefix?: string;
  /** Random seed (auto-generated if not specified) */
  seed?: number;
  /** Preserve original file name (optional, default: false) */
  preserveName?: boolean;
  /** Shuffle blocks across all images instead of within each image independently (optional, default: false) */
  crossImageShuffle?: boolean;
}

/**
 * Information about the image before fragmentation.
 * This includes dimensions, channels, and block counts.
 */
export interface ImageInfo {
  /** Width */
  w: number;
  /** Height */
  h: number;
  /** Original file name in base64 encoding (optional) */
  name?: string;
}

export interface ManifestData {
  /** UUID */
  id: string;
  /** Version */
  version: string;
  /** Timestamp */
  timestamp: string;
  /** Config */
  config: Required<FragmentationConfig>;
  /** Image information */
  images: ImageInfo[];
}

export interface FragmentationResult {
  /** Manifest data */
  manifest: ManifestData;
  /** Fragmented images */
  fragmentedImages: Buffer[];
}
