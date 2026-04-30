import {
  DEFAULT_THUMBNAIL_SIZE,
  type FragmentationConfig,
  MANIFEST_FILE_NAME,
  type ManifestData,
  type RestoreOptions,
  type ShuffleOptions,
  generateFragmentFileName,
  generateRestoredFileName,
  generateRestoredOriginalFileName,
  validateFragmentImageCount,
  validateManifestOptions,
  validateOptionsWithImages,
  validateOutputDirectoryOption,
} from "@pixzle/core";
import { createDir, isUrl, loadJson, writeFile } from "./file";
import { ImageFragmenter } from "./fragmenter";
import { ImageRestorer } from "./restorer";
import { writeThumbnails } from "./thumbnailer";

export {
  ImageFragmenter,
  ImageRestorer,
  isUrl,
  type FragmentationConfig,
  type ManifestData,
};

async function shuffle(options: ShuffleOptions): Promise<ManifestData> {
  const { images, config, outputDir, thumbnail, thumbnailSize } =
    validateShuffleOptions(options);

  const fragmenter = new ImageFragmenter(config ?? {});
  const { manifest, fragmentedImages } =
    await fragmenter.fragmentImages(images);

  await createDir(outputDir, true);
  await writeFile(
    outputDir,
    MANIFEST_FILE_NAME,
    JSON.stringify(manifest, null, 2),
  );

  await Promise.all(
    fragmentedImages.map((img, i) => {
      const filename = generateFragmentFileName(manifest, i);
      return writeFile(outputDir, filename, img);
    }),
  );

  if (thumbnail || thumbnailSize !== undefined) {
    const size = thumbnailSize ?? DEFAULT_THUMBNAIL_SIZE;
    await writeThumbnails({ images, outputDir, manifest, size });
  }

  return manifest;
}

async function restore(options: RestoreOptions): Promise<void> {
  const {
    images,
    manifest: manifestSource,
    manifestData,
    outputDir,
  } = validateRestoreOptions(options);

  let manifest: ManifestData;
  if (manifestData) {
    manifest = manifestData;
  } else if (manifestSource) {
    manifest = await loadJson<ManifestData>(manifestSource);
  } else {
    throw new Error("Manifest not provided");
  }

  validateFragmentImageCount(images, manifest);

  const restorer = new ImageRestorer();
  const restoredImages = await restorer.restoreImages(images, manifest);

  await createDir(outputDir, true);

  const imageInfos = manifest.images;
  await Promise.all(
    restoredImages.map((img, i) => {
      const filename =
        generateRestoredOriginalFileName(imageInfos[i]) ??
        generateRestoredFileName(manifest, i);
      return writeFile(outputDir, filename, img);
    }),
  );
}

const pixzle = {
  shuffle,
  restore,
};

export default pixzle;

function validateCommonOptions<T extends ShuffleOptions | RestoreOptions>(
  options: T,
  context: string,
) {
  validateOptionsWithImages(options, context);
  validateOutputDirectoryOption(options, context);
  return options;
}

function validateShuffleOptions(options: ShuffleOptions) {
  if (options.thumbnailSize !== undefined) {
    if (
      !Number.isInteger(options.thumbnailSize) ||
      options.thumbnailSize <= 0
    ) {
      throw new Error("thumbnailSize must be a positive integer");
    }
  }
  return validateCommonOptions(options, "shuffle");
}

function validateRestoreOptions(options: RestoreOptions) {
  validateManifestOptions(options, "restore");
  return validateCommonOptions(options, "restore");
}
