import type {
  ImageChannels,
  ImageFormat,
  JpegQuality,
  PngCompressionLevel,
} from "@pixzle/core";

export interface ShuffleOptions {
  output: string;
  blockSize?: number;
  prefix?: string;
  seed?: number;
  preserveName?: boolean;
  crossImageShuffle?: boolean;
  format?: ImageFormat;
  channels?: ImageChannels;
  jpegQuality?: JpegQuality;
  pngCompression?: PngCompressionLevel;
}

export interface RestoreOptions {
  manifest?: string;
  output: string;
  blockSize?: number;
  seed?: number;
  width?: number;
  height?: number;
}
