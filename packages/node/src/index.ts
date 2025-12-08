import {
  type FragmentationConfig,
  MANIFEST_FILE_NAME,
  type ManifestData,
  type RestoreOptions,
  type ShuffleOptions,
  generateFragmentFileName,
  generateRestoredFileName,
  generateRestoredOriginalFileName,
  validateFragmentImageCount,
} from "@pixzle/core";
import { createDir, isUrl, loadJson, writeFile } from "./file";
import { ImageFragmenter } from "./fragmenter";
import { ImageRestorer } from "./restorer";

export {
  ImageFragmenter,
  ImageRestorer,
  isUrl,
  type FragmentationConfig,
  type ManifestData,
};

async function shuffle(options: ShuffleOptions): Promise<ManifestData> {
  const { images, config, outputDir } = validateShuffleOptions(options);

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
      const format = manifest.config.output?.format || "png";
      const filename =
        generateRestoredOriginalFileName(imageInfos[i]) ??
        generateRestoredFileName(manifest, i, format);
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
  if (!options) throw new Error(`[${context}] Options object is required.`);
  const { images, outputDir } = options;
  if (!images || !Array.isArray(images) || images.length === 0)
    throw new Error(`[${context}] images must be a non-empty array.`);
  if (!outputDir || typeof outputDir !== "string")
    throw new Error(`[${context}] outputDir is required and must be a string.`);
  return options;
}

function validateShuffleOptions(options: ShuffleOptions) {
  return validateCommonOptions(options, "shuffle");
}

function validateRestoreOptions(options: RestoreOptions) {
  const { manifest, manifestData } = options;
  if (!manifest && !manifestData)
    throw new Error("[restore] Either manifest or manifestData is required.");
  if (manifest && typeof manifest !== "string")
    throw new Error("[restore] manifest must be a string.");
  return validateCommonOptions(options, "restore");
}
