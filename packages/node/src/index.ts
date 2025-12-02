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
import { createDir, readJsonFile, writeFile } from "./file";
import { ImageFragmenter } from "./fragmenter";
import { ImageRestorer } from "./restorer";

export {
  ImageFragmenter,
  ImageRestorer,
  type FragmentationConfig,
  type ManifestData,
};

async function shuffle(options: ShuffleOptions): Promise<void> {
  const { imagePaths, config, outputDir } = validateShuffleOptions(options);

  const fragmenter = new ImageFragmenter(config ?? {});
  const { manifest, fragmentedImages } =
    await fragmenter.fragmentImages(imagePaths);

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
}

async function restore(options: RestoreOptions): Promise<void> {
  const { imagePaths, manifestPath, manifestData, outputDir } =
    validateRestoreOptions(options);

  let manifest: ManifestData;
  if (manifestData) {
    manifest = manifestData;
  } else if (manifestPath) {
    manifest = await readJsonFile<ManifestData>(manifestPath);
  } else {
    throw new Error("Manifest not provided");
  }

  validateFragmentImageCount(imagePaths, manifest);

  const restorer = new ImageRestorer();
  const restoredImages = await restorer.restoreImages(imagePaths, manifest);

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
  if (!options) throw new Error(`[${context}] Options object is required.`);
  const { imagePaths, outputDir } = options;
  if (!imagePaths || !Array.isArray(imagePaths) || imagePaths.length === 0)
    throw new Error(`[${context}] imagePaths must be a non-empty array.`);
  if (!outputDir || typeof outputDir !== "string")
    throw new Error(`[${context}] outputDir is required and must be a string.`);
  return options;
}

function validateShuffleOptions(options: ShuffleOptions) {
  return validateCommonOptions(options, "shuffle");
}

function validateRestoreOptions(options: RestoreOptions) {
  const { manifestPath, manifestData } = options;
  if (!manifestPath && !manifestData)
    throw new Error(
      "[restore] Either manifestPath or manifestData is required.",
    );
  if (manifestPath && typeof manifestPath !== "string")
    throw new Error("[restore] manifestPath must be a string.");
  return validateCommonOptions(options, "restore");
}
