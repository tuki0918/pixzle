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
 * Validates an array of image file paths or URLs
 * @param paths Array of file paths or URLs to validate
 * @returns Array of resolved absolute paths or original URLs
 */
export function validateImagePaths(paths: string[]): string[] {
  const resolvedPaths: string[] = [];

  for (const path of paths) {
    // If it's a URL, add it directly without local file validation
    if (isUrl(path)) {
      resolvedPaths.push(path);
      continue;
    }

    const resolvedPath = resolve(path);

    if (!existsSync(resolvedPath)) {
      console.error(`Error: File not found: ${path}`);
      process.exit(1);
    }

    if (!lstatSync(resolvedPath).isFile()) {
      console.error(`Error: Not a file: ${path}`);
      process.exit(1);
    }

    resolvedPaths.push(resolvedPath);
  }

  return resolvedPaths;
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
 * Validates manifest file path or URL
 * @param manifestPath Path to manifest file or URL
 * @returns Resolved absolute path or original URL
 */
export function validateManifestPath(manifestPath: string): string {
  // If it's a URL, return it directly without local file validation
  if (isUrl(manifestPath)) {
    return manifestPath;
  }

  const resolvedPath = resolve(manifestPath);

  if (!existsSync(resolvedPath)) {
    console.error(`Error: Manifest file not found: ${manifestPath}`);
    process.exit(1);
  }

  if (!lstatSync(resolvedPath).isFile()) {
    console.error(`Error: Manifest path is not a file: ${manifestPath}`);
    process.exit(1);
  }

  return resolvedPath;
}
