import {
  type ImageInfo,
  type ManifestData,
  validateRestoreImageOptions as validateCoreRestoreImageOptions,
  validateManifestOptions,
  validateOptionsWithImages,
} from "@pixzle/core";
import { ImageRestorer, type ImageSource } from "./restorer";

export { ImageRestorer, type ImageSource };

export interface BrowserRestoreOptions {
  /** Image sources - URLs, Blobs, HTMLImageElements, or ImageBitmaps */
  images: ImageSource[];
  /** Manifest source - URL string (e.g., "https://example.com/manifest.json") */
  manifest?: string;
  /** Manifest data object (alternative to manifest) */
  manifestData?: ManifestData;
  /** Fetch options to use when fetching resources (images, manifest) */
  fetchOptions?: RequestInit;
}

export interface BrowserRestoreImageOptions {
  /** Image source - URL, Blob, HTMLImageElement, or ImageBitmap */
  image: ImageSource;
  /** Block size used for fragmentation */
  blockSize: number;
  /** Seed used for shuffling */
  seed: string;
  /** Information about the original image (dimensions) */
  imageInfo: ImageInfo;
  /** Fetch options to use when fetching resources */
  fetchOptions?: RequestInit;
}

/**
 * Fetch JSON from a URL
 * @param url The URL to fetch JSON from
 * @param fetchOptions Optional fetch options
 * @returns Promise resolving to the parsed JSON
 */
export async function fetchJson<T>(
  url: string,
  fetchOptions?: RequestInit,
): Promise<T> {
  const response = await fetch(url, fetchOptions);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch: ${response.status} ${response.statusText}`,
    );
  }
  return response.json() as Promise<T>;
}

/**
 * Fetch manifest data from a URL
 * @param url The URL to fetch manifest from
 * @param fetchOptions Optional fetch options
 * @returns Promise resolving to ManifestData
 */
export async function fetchManifest(
  url: string,
  fetchOptions?: RequestInit,
): Promise<ManifestData> {
  return fetchJson<ManifestData>(url, fetchOptions);
}

async function restore(options: BrowserRestoreOptions): Promise<ImageBitmap[]> {
  const {
    images,
    manifest: manifestSource,
    manifestData,
    fetchOptions,
  } = validateRestoreOptions(options);

  let manifest: ManifestData;
  if (manifestData) {
    manifest = manifestData;
  } else if (manifestSource) {
    manifest = await fetchManifest(manifestSource, fetchOptions);
  } else {
    throw new Error("Manifest not provided");
  }

  const restorer = new ImageRestorer();
  return await restorer.restoreImages(images, manifest, fetchOptions);
}

async function restoreImage(
  options: BrowserRestoreImageOptions,
): Promise<ImageBitmap> {
  const { image, blockSize, seed, imageInfo, fetchOptions } =
    validateRestoreImageOptions(options);

  const restorer = new ImageRestorer();
  return await restorer.restoreImage(
    image,
    blockSize,
    seed,
    imageInfo,
    fetchOptions,
  );
}

const pixzle = {
  restore,
  restoreImage,
};

export default pixzle;

function validateRestoreOptions(options: BrowserRestoreOptions) {
  validateOptionsWithImages(options, "restore");
  validateManifestOptions(options, "restore");
  return options;
}

function validateRestoreImageOptions(options: BrowserRestoreImageOptions) {
  validateCoreRestoreImageOptions(options, "restoreImage");
  return options;
}
