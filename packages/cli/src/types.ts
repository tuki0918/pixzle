export interface ShuffleOptions {
  output: string;
  blockSize?: number;
  prefix?: string;
  seed?: string;
  preserveName?: boolean;
  crossImageShuffle?: boolean;
}

export interface RestoreOptions {
  manifest?: string;
  output: string;
  blockSize?: number;
  seed?: string;
  width?: number;
  height?: number;
}
