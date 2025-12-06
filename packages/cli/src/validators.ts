import { existsSync, lstatSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { isUrl } from "@pixzle/node";

/**
 * Check if a string is a URL
 * @param str String to check
 * @returns true if the string is a valid URL
 */
export { isUrl };

/**
 * Validates an array of image sources (file paths or URLs)
 * @param sources Array of file paths or URLs to validate
 * @returns Array of resolved absolute paths or original URLs
 */
export function validateImageSources(sources: string[]): string[] {
  const resolvedSources: string[] = [];

  for (const source of sources) {
    // If it's a URL, add it directly without local file validation
    if (isUrl(source)) {
      resolvedSources.push(source);
      continue;
    }

    const resolvedPath = resolve(source);

    if (!existsSync(resolvedPath)) {
      console.error(`Error: File not found: ${source}`);
      process.exit(1);
    }

    if (!lstatSync(resolvedPath).isFile()) {
      console.error(`Error: Not a file: ${source}`);
      process.exit(1);
    }

    resolvedSources.push(resolvedPath);
  }

  return resolvedSources;
}

/**
 * Validates output directory path
 * @param outputPath Output directory path
 * @returns Resolved absolute path
 */
export function validateOutputDirectory(outputPath: string): string {
  const resolvedPath = resolve(outputPath);

  // Create parent directory if it doesn't exist
  const parentDir = dirname(resolvedPath);
  if (!existsSync(parentDir)) {
    console.error(`Error: Parent directory does not exist: ${parentDir}`);
    process.exit(1);
  }

  return resolvedPath;
}

/**
 * Validates manifest source (file path or URL)
 * @param source Path to manifest file or URL
 * @returns Resolved absolute path or original URL
 */
export function validateManifestSource(source: string): string {
  // If it's a URL, return it directly without local file validation
  if (isUrl(source)) {
    return source;
  }

  const resolvedPath = resolve(source);

  if (!existsSync(resolvedPath)) {
    console.error(`Error: Manifest file not found: ${source}`);
    process.exit(1);
  }

  if (!lstatSync(resolvedPath).isFile()) {
    console.error(`Error: Manifest path is not a file: ${source}`);
    process.exit(1);
  }

  return resolvedPath;
}
