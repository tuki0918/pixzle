import {
  DEFAULT_FRAGMENTATION_CONFIG,
  type FragmentationConfig,
  type FragmentationResult,
  type ImageBufferData,
  type ImageInfo,
  type ManifestData,
  encodeFileName,
  fragmentImageBuffers,
  validateFileNames,
} from "@pixzle/core";
import { SeededRandom } from "@tuki0918/seeded-shuffle";
import { VERSION } from "./constants";
import { fileNameWithoutExtension, loadBuffer } from "./file";
import { createPngFromImageBuffer, loadImageBuffer } from "./image-buffer";
import { generateManifestId } from "./utils";

export class ImageFragmenter {
  private config: Required<FragmentationConfig>;

  constructor(config: FragmentationConfig) {
    this.config = this.initializeConfig(config);
  }

  private initializeConfig(
    config: FragmentationConfig,
  ): Required<FragmentationConfig> {
    return {
      blockSize: config.blockSize ?? DEFAULT_FRAGMENTATION_CONFIG.BLOCK_SIZE,
      prefix: config.prefix ?? DEFAULT_FRAGMENTATION_CONFIG.PREFIX,
      seed: config.seed || SeededRandom.generateSeed(),
      preserveName:
        config.preserveName ?? DEFAULT_FRAGMENTATION_CONFIG.PRESERVE_NAME,
      crossImageShuffle:
        config.crossImageShuffle ??
        DEFAULT_FRAGMENTATION_CONFIG.CROSS_IMAGE_SHUFFLE,
    };
  }

  async fragmentImages(paths: string[]): Promise<FragmentationResult> {
    const manifestId = generateManifestId();
    const sources = await Promise.all(
      paths.map((path) => this.loadSourceImage(path)),
    );
    const imageInfos = paths.map((path, index) =>
      this.createImageInfo(path, sources[index].width, sources[index].height),
    );

    validateFileNames(imageInfos, this.config.preserveName);

    const fragmentedBuffers = fragmentImageBuffers(sources, this.config);
    const fragmentedImages = await Promise.all(
      fragmentedBuffers.map((fragment) =>
        createPngFromImageBuffer(
          Buffer.from(fragment.buffer),
          fragment.width,
          fragment.height,
        ),
      ),
    );

    return {
      manifest: this.createManifest(manifestId, imageInfos),
      fragmentedImages,
    };
  }

  private createManifest(
    manifestId: string,
    imageInfos: ImageInfo[],
  ): ManifestData {
    return {
      id: manifestId,
      version: VERSION,
      timestamp: new Date().toISOString(),
      config: this.config,
      images: imageInfos,
    };
  }

  private async loadSourceImage(path: string): Promise<ImageBufferData> {
    const buffer = await loadBuffer(path);
    const { imageBuffer, width, height } = await loadImageBuffer(buffer);

    return {
      buffer: imageBuffer,
      width,
      height,
    };
  }

  private createImageInfo(
    path: string,
    width: number,
    height: number,
  ): ImageInfo {
    return {
      w: width,
      h: height,
      name: this.config.preserveName
        ? encodeFileName(fileNameWithoutExtension(path))
        : undefined,
    };
  }
}
