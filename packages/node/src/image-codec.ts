import { RGBA_CHANNELS } from "@pixzle/core";
import sharp from "sharp";

interface DecodedImageResult {
  imageBuffer: Buffer;
  width: number;
  height: number;
  format?: string;
}

function createRawImagePipeline(
  imageBuffer: Buffer,
  width: number,
  height: number,
) {
  return sharp(imageBuffer, {
    raw: {
      width,
      height,
      channels: RGBA_CHANNELS,
    },
  });
}

export async function decodeImage(
  input: string | Buffer,
): Promise<DecodedImageResult> {
  const image = sharp(input).ensureAlpha();
  const metadata = await image.metadata();
  const { data, info } = await image
    .raw()
    .toBuffer({ resolveWithObject: true });

  if (!info.width || !info.height) {
    throw new Error("Decoded image is missing dimensions");
  }

  return {
    imageBuffer: Buffer.from(data),
    width: info.width,
    height: info.height,
    format: metadata.format ?? info.format,
  };
}

export async function encodePng(
  imageBuffer: Buffer,
  width: number,
  height: number,
): Promise<Buffer> {
  return await createRawImagePipeline(imageBuffer, width, height)
    .png()
    .toBuffer();
}

export async function resizePngInsideSquare(
  input: string | Buffer,
  size: number,
): Promise<Buffer> {
  return await sharp(input)
    .resize({
      width: size,
      height: size,
      fit: "inside",
      withoutEnlargement: true,
    })
    .png()
    .toBuffer();
}

export async function writePngFile(
  outputPath: string,
  imageBuffer: Buffer,
  width: number,
  height: number,
): Promise<void> {
  await createRawImagePipeline(imageBuffer, width, height)
    .png()
    .toFile(outputPath);
}
