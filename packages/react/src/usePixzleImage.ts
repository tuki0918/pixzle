import pixzle, { fetchManifest } from "@pixzle/browser";
import type { ImageInfo, ManifestData } from "@pixzle/core";
import { useEffect, useState } from "react";
import { imageBitmapToBlobUrl } from "./utils";

/**
 * Props for usePixzleImage hook with explicit parameters
 */
export interface UsePixzleImageExplicitProps {
  blockSize: number;
  seed: number;
  imageInfo: ImageInfo;
  image: string | Blob;
  manifest?: never;
  manifestData?: never;
}

/**
 * Props for usePixzleImage hook with manifest URL
 */
export interface UsePixzleImageManifestUrlProps {
  image: string | Blob;
  manifest: string;
  manifestData?: never;
  blockSize?: never;
  seed?: never;
  imageInfo?: never;
}

/**
 * Props for usePixzleImage hook with manifest data
 */
export interface UsePixzleImageManifestDataProps {
  image: string | Blob;
  manifestData: ManifestData;
  manifest?: never;
  blockSize?: never;
  seed?: never;
  imageInfo?: never;
}

export type UsePixzleImageProps =
  | UsePixzleImageExplicitProps
  | UsePixzleImageManifestUrlProps
  | UsePixzleImageManifestDataProps;

export interface UsePixzleImageResult {
  src: string | undefined;
  isLoading: boolean;
  error: Error | null;
}

function isExplicitProps(
  props: UsePixzleImageProps,
): props is UsePixzleImageExplicitProps {
  return "blockSize" in props && props.blockSize !== undefined;
}

function isManifestUrlProps(
  props: UsePixzleImageProps,
): props is UsePixzleImageManifestUrlProps {
  return "manifest" in props && props.manifest !== undefined;
}

function isManifestDataProps(
  props: UsePixzleImageProps,
): props is UsePixzleImageManifestDataProps {
  return "manifestData" in props && props.manifestData !== undefined;
}

export const usePixzleImage = (
  props: UsePixzleImageProps,
): UsePixzleImageResult => {
  const [src, setSrc] = useState<string | undefined>(undefined);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const { image } = props;

  // Extract dependencies based on props type
  const blockSize = isExplicitProps(props) ? props.blockSize : undefined;
  const seed = isExplicitProps(props) ? props.seed : undefined;
  const imageInfo = isExplicitProps(props) ? props.imageInfo : undefined;
  const manifest = isManifestUrlProps(props) ? props.manifest : undefined;
  const manifestData = isManifestDataProps(props)
    ? props.manifestData
    : undefined;

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);

    const restore = async () => {
      try {
        let resolvedBlockSize: number;
        let resolvedSeed: number;
        let resolvedImageInfo: ImageInfo;

        if (blockSize !== undefined && seed !== undefined && imageInfo) {
          // Explicit props
          resolvedBlockSize = blockSize;
          resolvedSeed = seed;
          resolvedImageInfo = imageInfo;
        } else if (manifest) {
          // Fetch manifest from URL
          const fetchedManifest = await fetchManifest(manifest);
          resolvedBlockSize = fetchedManifest.config.blockSize;
          resolvedSeed = fetchedManifest.config.seed;
          resolvedImageInfo = fetchedManifest.images[0];
        } else if (manifestData) {
          // Use provided manifest data
          resolvedBlockSize = manifestData.config.blockSize;
          resolvedSeed = manifestData.config.seed;
          resolvedImageInfo = manifestData.images[0];
        } else {
          throw new Error(
            "Either (blockSize, seed, imageInfo) or manifest/manifestData is required",
          );
        }

        const restoredBitmap = await pixzle.restoreImage({
          image,
          blockSize: resolvedBlockSize,
          seed: resolvedSeed,
          imageInfo: resolvedImageInfo,
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
  }, [blockSize, seed, imageInfo, image, manifest, manifestData]);

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
