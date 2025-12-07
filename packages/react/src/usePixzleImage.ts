import pixzle from "@pixzle/browser";
import type { ImageInfo } from "@pixzle/core";
import { useEffect, useState } from "react";
import { imageBitmapToBlobUrl } from "./utils";

export interface UsePixzleImageProps {
  blockSize: number;
  seed: number;
  imageInfo: ImageInfo;
  image: string | Blob;
}

export interface UsePixzleImageResult {
  src: string | undefined;
  isLoading: boolean;
  error: Error | null;
}

export const usePixzleImage = ({
  blockSize,
  seed,
  imageInfo,
  image,
}: UsePixzleImageProps): UsePixzleImageResult => {
  const [src, setSrc] = useState<string | undefined>(undefined);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);

    const restore = async () => {
      try {
        const restoredBitmap = await pixzle.restoreImage({
          image,
          blockSize,
          seed,
          imageInfo,
        });

        if (!active) return;

        const url = await imageBitmapToBlobUrl(restoredBitmap);

        if (!active) return;

        setSrc((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
        setIsLoading(false);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
        }
      }
    };

    restore();

    return () => {
      active = false;
    };
  }, [blockSize, seed, imageInfo, image]);

  // Cleanup URL on unmount
  useEffect(() => {
    return () => {
      if (src) {
        URL.revokeObjectURL(src);
      }
    };
  }, [src]);

  return { src, isLoading, error };
};
