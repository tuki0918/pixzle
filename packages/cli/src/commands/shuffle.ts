import type {
  FragmentationConfig,
  ImageChannels,
  ImageFormat,
  JpegQuality,
  PngCompressionLevel,
} from "@pixzle/core";
import pixzle from "@pixzle/node";
import type { Command } from "commander";
import type { ShuffleOptions } from "../types";
import { validateImageSources, validateOutputDirectory } from "../validators";

/**
 * Configures and registers the shuffle command
 * @param program Commander program instance
 */
export function registerShuffleCommand(program: Command): void {
  program
    .command("shuffle")
    .description("Fragment images")
    .argument("<images...>", "Input image file paths")
    .requiredOption("-o, --output <dir>", "Output directory")
    .option("-b, --block-size <size>", "Pixel block size", (value: string) => {
      const num = Number.parseInt(value, 10);
      if (Number.isNaN(num) || num <= 0) {
        throw new Error("Block size must be a positive integer");
      }
      return num;
    })
    .option("-p, --prefix <prefix>", "Prefix for fragment files")
    .option("-s, --seed <seed>", "Random seed", (value: string) => {
      const num = Number.parseInt(value, 10);
      if (Number.isNaN(num)) {
        throw new Error("Seed must be an integer");
      }
      return num;
    })
    .option("--preserve-name", "Preserve original file names")
    .option(
      "--cross-image-shuffle",
      "Shuffle blocks across all images instead of within each image independently",
    )
    .option(
      "-f, --format <format>",
      "Output format: png (default) or jpeg",
      (value: string) => {
        const lower = value.toLowerCase();
        if (lower !== "png" && lower !== "jpeg" && lower !== "jpg") {
          throw new Error("Format must be 'png' or 'jpeg'");
        }
        return (lower === "jpg" ? "jpeg" : lower) as ImageFormat;
      },
    )
    .option(
      "-c, --channels <channels>",
      "Color channels: 4=RGBA (default), 3=RGB",
      (value: string) => {
        const num = Number.parseInt(value, 10);
        if (num !== 3 && num !== 4) {
          throw new Error("Channels must be 3 (RGB) or 4 (RGBA)");
        }
        return num as ImageChannels;
      },
    )
    .option(
      "--jpeg-quality <quality>",
      "JPEG quality: low, normal (default), high, or 0-100",
      (value: string) => {
        const num = Number.parseInt(value, 10);
        if (!Number.isNaN(num)) {
          if (num < 0 || num > 100) {
            throw new Error("JPEG quality must be between 0 and 100");
          }
          return num;
        }
        const lower = value.toLowerCase();
        if (lower !== "low" && lower !== "normal" && lower !== "high") {
          throw new Error(
            "JPEG quality must be 'low', 'normal', 'high', or 0-100",
          );
        }
        return lower as JpegQuality;
      },
    )
    .option(
      "--png-compression <level>",
      "PNG compression level: 0-9 (0=none, 9=max, default=6)",
      (value: string) => {
        const num = Number.parseInt(value, 10);
        if (Number.isNaN(num) || num < 0 || num > 9) {
          throw new Error("PNG compression level must be between 0 and 9");
        }
        return num as PngCompressionLevel;
      },
    )
    .action(handleShuffleCommand);
}

/**
 * Handles the shuffle command execution
 * @param images Array of image file paths
 * @param options Command options
 */
async function handleShuffleCommand(
  images: string[],
  options: ShuffleOptions,
): Promise<void> {
  try {
    console.log("🔀 Starting image fragmentation...");

    const validatedImages = validateImageSources(images);
    const outputDir = validateOutputDirectory(options.output);

    const config: FragmentationConfig = {};
    if (options.blockSize !== undefined) config.blockSize = options.blockSize;
    if (options.prefix !== undefined) config.prefix = options.prefix;
    if (options.seed !== undefined) config.seed = options.seed;
    if (options.preserveName) config.preserveName = true;
    if (options.crossImageShuffle) config.crossImageShuffle = true;

    // Add output options
    if (
      options.format ||
      options.channels ||
      options.jpegQuality !== undefined ||
      options.pngCompression !== undefined
    ) {
      config.output = {
        format: options.format,
        channels: options.channels,
        jpegQuality: options.jpegQuality,
        pngCompressionLevel: options.pngCompression,
      };
    }

    await pixzle.shuffle({
      images: validatedImages,
      outputDir,
      config: Object.keys(config).length > 0 ? config : undefined,
    });

    const formatInfo = options.format
      ? ` (${options.format.toUpperCase()})`
      : "";
    console.log(
      `✅ Images fragmented successfully to: ${outputDir}${formatInfo}`,
    );
  } catch (error) {
    console.error(
      `❌ Fragmentation failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }
}
