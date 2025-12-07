import type { ManifestData } from "@pixzle/core";
import type React from "react";
import { useEffect } from "react";
import { type UsePixzleImagesResult, usePixzleImages } from "./usePixzleImages";

export type PixzleImagesChildrenProps = Pick<
  UsePixzleImagesResult,
  "sources" | "isLoading" | "error" | "progress"
>;

export interface PixzleImagesProps {
  /** Image sources - URLs or Blobs */
  images: (string | Blob)[];
  /** Manifest URL */
  manifest?: string;
  /** Manifest data object (alternative to manifest) */
  manifestData?: ManifestData;
  /** Render function for restored images */
  children: (props: PixzleImagesChildrenProps) => React.ReactNode;
  /** Fallback while loading */
  fallback?: React.ReactNode;
  /** Error fallback */
  errorFallback?: React.ReactNode | ((error: Error) => React.ReactNode);
  /** Error callback */
  onError?: (error: Error) => void;
  /** Load complete callback */
  onLoad?: (sources: string[]) => void;
}

export const PixzleImages: React.FC<PixzleImagesProps> = ({
  images,
  manifest,
  manifestData,
  children,
  fallback = null,
  errorFallback = null,
  onError,
  onLoad,
}) => {
  const { sources, isLoading, error, progress } = usePixzleImages({
    images,
    manifest,
    manifestData,
  });

  useEffect(() => {
    if (error) {
      console.error("PixzleImages restoration error:", error);
      onError?.(error);
    }
  }, [error, onError]);

  useEffect(() => {
    if (!isLoading && sources.length > 0 && !error) {
      onLoad?.(sources);
    }
  }, [isLoading, sources, error, onLoad]);

  if (error) {
    if (errorFallback) {
      return (
        <>
          {typeof errorFallback === "function"
            ? errorFallback(error)
            : errorFallback}
        </>
      );
    }
    return null;
  }

  if (isLoading) {
    return <>{fallback}</>;
  }

  return <>{children({ sources, isLoading, error, progress })}</>;
};

PixzleImages.displayName = "PixzleImages";
