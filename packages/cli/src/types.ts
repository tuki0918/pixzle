export interface ShuffleOptions {
  output: string;
  blockSize?: number;
  prefix?: string;
  seed?: string;
  preserveName?: boolean;
  crossImageShuffle?: boolean;
  thumbnail?: boolean;
  thumbnailSize?: number;
}

export interface RestoreOptions {
  manifest?: string;
  output: string;
  blockSize?: number;
  seed?: string;
  width?: number;
  height?: number;
}
