import pixzle from "@pixzle/browser";
import type { ManifestData } from "@pixzle/core";
import { useCallback, useEffect, useRef, useState } from "react";
import { imageBitmapToBlobUrl } from "./utils";

export interface UsePixzleImagesProps {
  /** Image sources - URLs or Blobs */
  images: (string | Blob)[];
  /** Manifest URL */
  manifest?: string;
  /** Manifest data object (alternative to manifest) */
  manifestData?: ManifestData;
  /** Whether to auto-start restoration */
  autoRestore?: boolean;
}

export interface UsePixzleImagesResult {
  /** Restored image URLs (object URLs) */
  sources: string[];
  /** Loading state */
  isLoading: boolean;
  /** Error if restoration failed */
  error: Error | null;
  /** Progress (0-1) */
  progress: number;
  /** Manually trigger restoration */
  restore: () => Promise<void>;
}

export const usePixzleImages = ({
  images,
  manifest,
  manifestData,
  autoRestore = true,
}: UsePixzleImagesProps): UsePixzleImagesResult => {
  const [sources, setSources] = useState<string[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const sourcesRef = useRef<string[]>([]);

  // Keep ref in sync with sources state
  useEffect(() => {
    sourcesRef.current = sources;
  }, [sources]);

  const restore = useCallback(async () => {
    if (!images.length) return;
    if (!manifest && !manifestData) return;

    setIsLoading(true);
    setError(null);
    setProgress(0);

    try {
      const restoredBitmaps = await pixzle.restore({
        images,
        manifest,
        manifestData,
      });

      const urls: string[] = [];

      for (let i = 0; i < restoredBitmaps.length; i++) {
        const bitmap = restoredBitmaps[i];
        const url = await imageBitmapToBlobUrl(bitmap);
        urls.push(url);
        setProgress((i + 1) / restoredBitmaps.length);
      }

      // Cleanup old URLs
      setSources((prev) => {
        for (const url of prev) {
          URL.revokeObjectURL(url);
        }
        return urls;
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [images, manifest, manifestData]);

  useEffect(() => {
    if (autoRestore) {
      restore();
    }
  }, [restore, autoRestore]);

  // Cleanup URLs on unmount
  useEffect(() => {
    return () => {
      for (const url of sourcesRef.current) {
        URL.revokeObjectURL(url);
      }
    };
  }, []);

  return { sources, isLoading, error, progress, restore };
};
