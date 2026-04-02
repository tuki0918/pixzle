import crypto from "node:crypto";
import { customAlphabet } from "nanoid";

const SEED_ALPHABET =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const SEED_LENGTH = 12;
const generateSeed = customAlphabet(SEED_ALPHABET, SEED_LENGTH);

/**
 * Generate a unique manifest ID
 * @returns A UUID string
 */
export function generateManifestId(): string {
  return crypto.randomUUID();
}

/**
 * Generate a compact random seed ID
 * @returns A 12-character base62 string
 */
export function generateSeedId(): string {
  return generateSeed();
}
