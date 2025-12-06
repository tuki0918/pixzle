import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Check if a string is a URL
 * @param str String to check
 * @returns true if the string is a valid URL
 */
export function isUrl(str: string): boolean {
  try {
    const url = new URL(str);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Fetch data from a URL and return as Buffer
 * @param url URL to fetch
 * @returns Buffer containing the fetched data
 */
export async function fetchBuffer(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch ${url}: ${response.status} ${response.statusText}`,
    );
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Create a directory
 * @param dir Directory path
 * @param recursive Create parent directories if they don't exist
 */
export async function createDir(dir: string, recursive = false) {
  await fs.mkdir(dir, { recursive });
}

/**
 * Write a file
 * @param dir Directory path
 * @param filename Filename
 * @param data Data to write
 * @returns Path to the file
 */
export async function writeFile(
  dir: string,
  filename: string,
  data: string | Buffer,
) {
  const filePath = path.join(dir, filename);
  await fs.writeFile(filePath, data);
  return filePath;
}

/**
 * Read a JSON file and return its content
 * @param filePath Path to the JSON file or URL
 * @returns Content of the JSON file
 */
export async function readJsonFile<T>(filePath: string): Promise<T> {
  if (isUrl(filePath)) {
    const buffer = await fetchBuffer(filePath);
    return JSON.parse(buffer.toString("utf8"));
  }
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

/**
 * Read a file or URL and return its content as Buffer
 * @param filePath Path to the file or URL
 * @returns Content of the file as Buffer
 */
export async function readFileBuffer(filePath: string): Promise<Buffer> {
  if (isUrl(filePath)) {
    return await fetchBuffer(filePath);
  }
  return await fs.readFile(filePath);
}

/**
 * Get the filename without the extension
 * @param filePath Path to the file
 * @returns Filename without the extension
 */
export function fileNameWithoutExtension(filePath: string): string {
  return path.basename(filePath, path.extname(filePath));
}
