import {
  type ImageBufferData,
  type ImageInfo,
  type ManifestData,
  createSingleImageManifest,
  restoreImageBuffers,
  restoreSingleImageBuffer,
  validateFragmentImageCount,
} from "@pixzle/core";
import { imageBufferToImageBitmap, imageToImageBuffer } from "./image-buffer";

export type ImageSource = string | URL | Blob | HTMLImageElement | ImageBitmap;

export class ImageRestorer {
  /**
   * Restore multiple images from shuffled fragments
   * @param fragments Array of fragment sources (URLs, Blobs, HTMLImageElements, or ImageBitmaps)
   * @param manifest The manifest data containing restoration information
   * @returns Promise resolving to an array of restored ImageBitmaps
   */
  async restoreImages(
    fragments: ImageSource[],
    manifest: ManifestData,
    fetchOptions?: RequestInit,
  ): Promise<ImageBitmap[]> {
    validateFragmentImageCount(fragments, manifest);

    if (!manifest.config.crossImageShuffle) {
      return await this.restoreEachImage(fragments, manifest, fetchOptions);
    }

    const fragmentImages = await Promise.all(
      fragments.map(async (fragment): Promise<ImageBufferData> => {
        return await this.loadImageBufferFromSource(fragment, fetchOptions);
      }),
    );
    const restoredBuffers = restoreImageBuffers(fragmentImages, manifest);
    fragmentImages.length = 0;

    const restoredImages: ImageBitmap[] = [];

    for (let index = 0; index < restoredBuffers.length; index++) {
      const restoredBuffer = restoredBuffers[index];
      restoredImages.push(
        await imageBufferToImageBitmap(
          restoredBuffer,
          manifest.images[index].w,
          manifest.images[index].h,
        ),
      );
      restoredBuffers[index] = new Uint8Array(0);
      await this.yieldToMainThread();
    }

    return restoredImages;
  }

  /**
   * Restore a single image from a shuffled source
   * @param imageSource The shuffled image (URL, Blob, HTMLImageElement, or ImageBitmap)
   * @param blockSize The block size used for fragmentation
   * @param seed The seed used for shuffling
   * @param imageInfo Information about the original image (dimensions)
   * @returns Promise resolving to the restored ImageBitmap
   */
  async restoreImage(
    imageSource: ImageSource,
    blockSize: number,
    seed: number,
    imageInfo: ImageInfo,
    fetchOptions?: RequestInit,
  ): Promise<ImageBitmap> {
    const manifest = createSingleImageManifest({ blockSize, seed, imageInfo });

    const [restoredImage] = await this.restoreImages(
      [imageSource],
      manifest,
      fetchOptions,
    );
    return restoredImage;
  }

  private async restoreEachImage(
    fragments: ImageSource[],
    manifest: ManifestData,
    fetchOptions?: RequestInit,
  ): Promise<ImageBitmap[]> {
    const restoredImages: ImageBitmap[] = [];

    for (let index = 0; index < fragments.length; index++) {
      const fragment = await this.loadImageBufferFromSource(
        fragments[index],
        fetchOptions,
      );
      const restoredBuffer = restoreSingleImageBuffer(
        fragment,
        manifest.config,
        manifest.images[index],
      );
      restoredImages.push(
        await imageBufferToImageBitmap(
          restoredBuffer,
          manifest.images[index].w,
          manifest.images[index].h,
        ),
      );
      await this.yieldToMainThread();
    }

    return restoredImages;
  }

  private async loadImageSource(
    sourceInput: string | URL | Blob | HTMLImageElement | ImageBitmap,
    fetchOptions?: RequestInit,
  ): Promise<HTMLImageElement | ImageBitmap> {
    let source = sourceInput;
    if (typeof URL !== "undefined" && source instanceof URL) {
      source = source.toString();
    }

    if (
      typeof HTMLImageElement !== "undefined" &&
      source instanceof HTMLImageElement
    ) {
      if (source.complete) return source;
      await new Promise<void>((resolve, reject) => {
        const handleLoad = () => {
          cleanup();
          resolve();
        };
        const handleError = () => {
          cleanup();
          reject(new Error("Failed to load image"));
        };
        const cleanup = () => {
          source.removeEventListener("load", handleLoad);
          source.removeEventListener("error", handleError);
        };

        source.addEventListener("load", handleLoad, { once: true });
        source.addEventListener("error", handleError, { once: true });
      });
      return source;
    }

    if (typeof ImageBitmap !== "undefined" && source instanceof ImageBitmap) {
      return source;
    }

    if (typeof Blob !== "undefined" && source instanceof Blob) {
      return createImageBitmap(source);
    }

    if (typeof source === "string") {
      const response = await fetch(source, fetchOptions);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch image: ${response.status} ${response.statusText}`,
        );
      }
      const blob = await response.blob();
      return createImageBitmap(blob);
    }

    throw new Error("Unsupported image source");
  }

  private async loadImageBufferFromSource(
    sourceInput: ImageSource,
    fetchOptions?: RequestInit,
  ): Promise<ImageBufferData> {
    const image = await this.loadImageSource(sourceInput, fetchOptions);
    const imageBuffer = imageToImageBuffer(image);

    if (
      image instanceof ImageBitmap &&
      (typeof sourceInput === "string" ||
        (typeof URL !== "undefined" && sourceInput instanceof URL) ||
        (typeof Blob !== "undefined" && sourceInput instanceof Blob))
    ) {
      image.close();
    }

    return imageBuffer;
  }

  private async yieldToMainThread(): Promise<void> {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });
  }
}
