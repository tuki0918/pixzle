import {
  DEFAULT_FRAGMENTATION_CONFIG,
  type FragmentationConfig,
  type FragmentationResult,
  type ImageInfo,
  type ManifestData,
  RGBA_CHANNELS,
  buildCumulativeCounts,
  calculateBlockCounts,
  calculateBlockCountsForCrossImages,
  copyBlockFromImageBuffer,
  createPermutation,
  encodeFileName,
  findIndexInCumulative,
  validateFileNames,
} from "@pixzle/core";
import { SeededRandom } from "@tuki0918/seeded-shuffle";
import { VERSION } from "./constants";
import { fileNameWithoutExtension, loadBuffer } from "./file";
import { createPngFromImageBuffer, loadImageBuffer } from "./image-buffer";
import { generateManifestId } from "./utils";

interface SourceImageData {
  buffer: Buffer;
  width: number;
  height: number;
  blockCount: number;
}

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
    if (this.config.crossImageShuffle) {
      return await this.fragmentAcrossImages(paths);
    }
    return await this.fragmentEachImage(paths);
  }

  private async fragmentEachImage(
    paths: string[],
  ): Promise<FragmentationResult> {
    const manifestId = generateManifestId();
    const imageInfos: ImageInfo[] = [];
    const fragmentedImages: Buffer[] = [];

    for (const path of paths) {
      const source = await this.loadSourceImage(path);
      const imageInfo = this.createImageInfo(path, source.width, source.height);
      imageInfos.push(imageInfo);

      const permutation = createPermutation(
        source.blockCount,
        this.config.seed,
      );
      const fragment = await this.renderFragmentFromSource(source, permutation);
      fragmentedImages.push(fragment);
    }

    validateFileNames(imageInfos, this.config.preserveName);
    const manifest = this.createManifest(manifestId, imageInfos);

    return { manifest, fragmentedImages };
  }

  private async fragmentAcrossImages(
    paths: string[],
  ): Promise<FragmentationResult> {
    const manifestId = generateManifestId();
    const imageInfos: ImageInfo[] = [];
    const sources: SourceImageData[] = [];

    for (const path of paths) {
      const source = await this.loadSourceImage(path);
      sources.push(source);
      imageInfos.push(this.createImageInfo(path, source.width, source.height));
    }

    validateFileNames(imageInfos, this.config.preserveName);
    const manifest = this.createManifest(manifestId, imageInfos);

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
      const { blocksPerRow, width, height } = calculateFragmentLayout(
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

  private async loadSourceImage(path: string): Promise<SourceImageData> {
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
      blockCount,
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

  private async renderFragmentFromSource(
    source: SourceImageData,
    permutation: number[],
  ): Promise<Buffer> {
    const blockCount = permutation.length;
    const { blocksPerRow, width, height } = calculateFragmentLayout(
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

function calculateFragmentLayout(
  blockCount: number,
  blockSize: number,
): {
  blocksPerRow: number;
  width: number;
  height: number;
} {
  if (blockCount <= 0 || blockSize <= 0) {
    return { blocksPerRow: 0, width: 0, height: 0 };
  }

  const blocksPerRow = Math.ceil(Math.sqrt(blockCount));
  const width = blocksPerRow * blockSize;
  const height = Math.ceil(blockCount / blocksPerRow) * blockSize;

  return { blocksPerRow, width, height };
}
