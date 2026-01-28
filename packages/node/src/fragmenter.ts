import {
  DEFAULT_FRAGMENTATION_CONFIG,
  type FragmentationConfig,
  type FragmentationResult,
  type ImageInfo,
  type ManifestData,
  RGBA_CHANNELS,
  calculateBlockCounts,
  calculateBlockCountsForCrossImages,
  encodeFileName,
  validateFileNames,
} from "@pixzle/core";
import { SeededRandom } from "@tuki0918/seeded-shuffle";
import {
  copyBlockFromImageBuffer,
  createPngFromImageBuffer,
  loadImageBuffer,
} from "./block";
import {
  buildCumulativeCounts,
  calculateFragmentGrid,
  createPermutation,
  findIndexInCumulative,
} from "./block-permutation";
import { VERSION } from "./constants";
import { fileNameWithoutExtension, loadBuffer } from "./file";
import { generateManifestId } from "./utils";

interface SourceImageData {
  buffer: Buffer;
  width: number;
  height: number;
  blockCountX: number;
  blockCountY: number;
  blockCount: number;
}

export class ImageFragmenter {
  private config: Required<FragmentationConfig>;

  constructor(config: FragmentationConfig) {
    this.config = this._initializeConfig(config);
  }

  private _initializeConfig(
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
    if (this.config.crossImageShuffle) {
      return await this._fragmentCrossImage(paths);
    }
    return await this._fragmentPerImage(paths);
  }

  private async _fragmentPerImage(
    paths: string[],
  ): Promise<FragmentationResult> {
    const manifestId = generateManifestId();
    const imageInfos: ImageInfo[] = [];
    const fragmentedImages: Buffer[] = [];

    for (const path of paths) {
      const source = await this._loadSourceImage(path);
      const imageInfo = this._createImageInfo(
        path,
        source.width,
        source.height,
      );
      imageInfos.push(imageInfo);

      const permutation = createPermutation(
        source.blockCount,
        this.config.seed,
      );
      const fragment = await this._renderFragmentFromSource(
        source,
        permutation,
      );
      fragmentedImages.push(fragment);
    }

    validateFileNames(imageInfos, this.config.preserveName);
    const manifest = this._createManifest(manifestId, imageInfos);

    return { manifest, fragmentedImages };
  }

  private async _fragmentCrossImage(
    paths: string[],
  ): Promise<FragmentationResult> {
    const manifestId = generateManifestId();
    const imageInfos: ImageInfo[] = [];
    const sources: SourceImageData[] = [];

    for (const path of paths) {
      const source = await this._loadSourceImage(path);
      sources.push(source);
      imageInfos.push(this._createImageInfo(path, source.width, source.height));
    }

    validateFileNames(imageInfos, this.config.preserveName);
    const manifest = this._createManifest(manifestId, imageInfos);

    const totalBlocks = sources.reduce(
      (sum, source) => sum + source.blockCount,
      0,
    );
    const permutation = createPermutation(totalBlocks, manifest.config.seed);

    const blockCountsForCrossImages = calculateBlockCountsForCrossImages(
      totalBlocks,
      paths.length,
    );

    const sourceCounts = sources.map((source) => source.blockCount);
    const sourceEnds = buildCumulativeCounts(sourceCounts);

    const fragmentedImages: Buffer[] = [];
    let offset = 0;

    for (const fragmentBlockCount of blockCountsForCrossImages) {
      const { blocksPerRow, width, height } = calculateFragmentGrid(
        fragmentBlockCount,
        this.config.blockSize,
      );

      const outputBuffer = Buffer.alloc(width * height * RGBA_CHANNELS);

      for (let i = 0; i < fragmentBlockCount; i++) {
        const globalIndex = offset + i;
        const sourceGlobalIndex = permutation[globalIndex];
        const { rangeIndex, localIndex } = findIndexInCumulative(
          sourceEnds,
          sourceCounts,
          sourceGlobalIndex,
        );
        const source = sources[rangeIndex];

        copyBlockFromImageBuffer(
          source.buffer,
          source.width,
          source.height,
          this.config.blockSize,
          localIndex,
          outputBuffer,
          width,
          height,
          i,
          blocksPerRow,
        );
      }

      fragmentedImages.push(
        await createPngFromImageBuffer(outputBuffer, width, height),
      );
      offset += fragmentBlockCount;
    }

    return { manifest, fragmentedImages };
  }

  private _createManifest(
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

  private async _loadSourceImage(path: string): Promise<SourceImageData> {
    const buffer = await loadBuffer(path);
    const { imageBuffer, width, height } = await loadImageBuffer(buffer);
    const blockCounts = calculateBlockCounts(
      width,
      height,
      this.config.blockSize,
    );
    const blockCount = blockCounts.blockCountX * blockCounts.blockCountY;

    return {
      buffer: imageBuffer,
      width,
      height,
      blockCountX: blockCounts.blockCountX,
      blockCountY: blockCounts.blockCountY,
      blockCount,
    };
  }

  private _createImageInfo(
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

  private async _renderFragmentFromSource(
    source: SourceImageData,
    permutation: number[],
  ): Promise<Buffer> {
    const blockCount = permutation.length;
    const { blocksPerRow, width, height } = calculateFragmentGrid(
      blockCount,
      this.config.blockSize,
    );

    const outputBuffer = Buffer.alloc(width * height * RGBA_CHANNELS);

    for (let i = 0; i < blockCount; i++) {
      const sourceIndex = permutation[i];
      copyBlockFromImageBuffer(
        source.buffer,
        source.width,
        source.height,
        this.config.blockSize,
        sourceIndex,
        outputBuffer,
        width,
        height,
        i,
        blocksPerRow,
      );
    }

    return await createPngFromImageBuffer(outputBuffer, width, height);
  }
}
