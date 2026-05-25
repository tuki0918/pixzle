import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const imagesDir = path.join(rootDir, "docs", "public", "images");
const fragmentedDir = path.join(imagesDir, "fragmented1");
const restoredDir = path.join(imagesDir, "restored1");
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

const inputImages = [
  path.join(imagesDir, "input_sample.png"),
  path.join(imagesDir, "input_sample_mono.png"),
  path.join(imagesDir, "input_sample_blue.png"),
];

const fragmentImages = [
  path.join(fragmentedDir, "img_1_fragmented.png"),
  path.join(fragmentedDir, "img_2_fragmented.png"),
  path.join(fragmentedDir, "img_3_fragmented.png"),
];

function runPixzleCli(args) {
  const result = spawnSync(
    pnpm,
    [
      "--dir",
      path.join(rootDir, "packages", "cli"),
      "exec",
      "tsx",
      "src/cli.ts",
      ...args,
    ],
    {
      cwd: rootDir,
      stdio: "inherit",
    },
  );

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

runPixzleCli([
  "shuffle",
  ...inputImages,
  "--output",
  fragmentedDir,
  "--seed",
  "pixzle-test",
]);

runPixzleCli([
  "restore",
  ...fragmentImages,
  "--manifest",
  path.join(fragmentedDir, "manifest.json"),
  "--output",
  restoredDir,
]);
