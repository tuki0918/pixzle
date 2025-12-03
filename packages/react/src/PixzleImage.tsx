import { BrowserImageRestorer } from "@pixzle/browser";
import type { ImageInfo } from "@pixzle/core";
import type React from "react";
import { useEffect, useState } from "react";

export interface PixzleImageProps
  extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> {
  blockSize: number;
  seed: number | string;
  imageInfo: ImageInfo;
  image: string | Blob;
}

export const PixzleImage: React.FC<PixzleImageProps> = ({
  blockSize,
  seed,
  imageInfo,
  image,
  alt = "",
  ...props
}) => {
  const [src, setSrc] = useState<string | undefined>(undefined);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let active = true;
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
          }
        });
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err : new Error(String(err)));
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

  if (error) {
    console.error("PixzleImage restoration error:", error);
    return null;
  }

  if (!src) {
    return null; // Or render a placeholder/loading state passed via props?
  }

  // biome-ignore lint/a11y/useAltText: alt is passed via props or defaults to empty string
  return <img src={src} alt={alt} {...props} />;
};
