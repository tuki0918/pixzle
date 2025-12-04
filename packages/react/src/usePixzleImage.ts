import { BrowserImageRestorer } from "@pixzle/browser";
import type { ImageInfo } from "@pixzle/core";
import { useEffect, useState } from "react";

export interface UsePixzleImageProps {
  blockSize: number;
  seed: number | string;
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

    const restorer = new BrowserImageRestorer();

    const restore = async () => {
      try {
        const restoredBitmap = await restorer.restoreImage(
          image,
          blockSize,
          seed,
          imageInfo,
        );

        if (!active) return;

        // Convert ImageBitmap to Blob URL to display in <img>
        const canvas = document.createElement("canvas");
        canvas.width = restoredBitmap.width;
        canvas.height = restoredBitmap.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Could not get 2D context");

        ctx.drawImage(restoredBitmap, 0, 0);

        canvas.toBlob((blob) => {
          if (!active) return;
          if (blob) {
            const url = URL.createObjectURL(blob);
            setSrc((prev) => {
              if (prev) URL.revokeObjectURL(prev);
              return url;
            });
            setIsLoading(false);
          } else {
            setError(new Error("Failed to create blob from canvas"));
            setIsLoading(false);
          }
        });
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
