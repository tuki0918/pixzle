import type { RestoreOptions as CoreRestoreOptions } from "@pixzle/core";
import { createSingleImageManifest } from "@pixzle/core";
import Pixzle from "@pixzle/node";
import type { Command } from "commander";
import type { RestoreOptions } from "../types";
import {
  validateImageSources,
  validateManifestSource,
  validateOutputDirectory,
} from "../validators";

/**
 * Configures and registers the restore command
 * @param program Commander program instance
 */
export function registerRestoreCommand(program: Command): void {
  program
    .command("restore")
    .description("Restore fragmented images")
    .argument("<fragments...>", "Fragment file paths")
    .option("-m, --manifest <path>", "Manifest file path")
    .requiredOption("-o, --output <dir>", "Output directory")
    .option("-b, --block-size <number>", "Block size", Number.parseInt)
    .option("-s, --seed <number>", "Random seed", Number.parseInt)
    .option("-w, --width <number>", "Image width", Number.parseInt)
    .option("-h, --height <number>", "Image height", Number.parseInt)
    .action(handleRestoreCommand);
}

/**
 * Handles the restore command execution
 * @param fragments Array of fragment file paths
 * @param options Command options
 */
async function handleRestoreCommand(
  fragments: string[],
  options: RestoreOptions,
): Promise<void> {
  try {
    console.log("🔀 Starting image restoration...");

    const images = validateImageSources(fragments);
    const outputDir = validateOutputDirectory(options.output);

    const restoreOptions: CoreRestoreOptions = {
      images,
      outputDir,
    };

    if (options.manifest) {
      restoreOptions.manifest = validateManifestSource(options.manifest);
    } else if (
      options.blockSize !== undefined &&
      options.seed !== undefined &&
      options.width !== undefined &&
      options.height !== undefined
    ) {
      if (images.length > 1) {
        throw new Error(
          "When using manual options (blockSize, seed, width, height), only a single image can be restored.",
        );
      }

      const manifestData = createSingleImageManifest({
        blockSize: options.blockSize,
        seed: options.seed,
        imageInfo: { w: options.width, h: options.height },
      });
      restoreOptions.manifestData = manifestData;
    } else {
      throw new Error(
        "Either manifest path or (blockSize, seed, width, height) must be provided.",
      );
    }

    await Pixzle.restore(restoreOptions);

    console.log(`✅ Images restored successfully to: ${outputDir}`);
  } catch (error) {
    console.error(
      `❌ Restoration failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }
}
