import type { ImageInfo } from "@pixzle/core";
import type React from "react";
import { usePixzleImage } from "./usePixzleImage";

export interface PixzleImageProps
  extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> {
  blockSize: number;
  seed: number | string;
  imageInfo: ImageInfo;
  image: string | Blob;
  /**
   * Element to render while the image is being restored.
   */
  fallback?: React.ReactNode;
  /**
   * Element to render if the image restoration fails.
   */
  errorFallback?: React.ReactNode | ((error: Error) => React.ReactNode);
  /**
   * Whether to protect the image from being saved via right-click or drag-and-drop.
   * @default true
   */
  protected?: boolean;
}

export const PixzleImage: React.FC<PixzleImageProps> = ({
  blockSize,
  seed,
  imageInfo,
  image,
  alt = "",
  fallback = null,
  errorFallback = null,
  protected: isProtected = true,
  ...props
}) => {
  const { src, isLoading, error } = usePixzleImage({
    blockSize,
    seed,
    imageInfo,
    image,
  });

  if (error) {
    console.error("PixzleImage restoration error:", error);
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

  if (isLoading || !src) {
    return <>{fallback}</>;
  }

  // biome-ignore lint/a11y/useAltText: alt is passed via props or defaults to empty string
  return (
    <img
      src={src}
      alt={alt}
      {...props}
      onContextMenu={(e) => {
        if (isProtected) e.preventDefault();
        props.onContextMenu?.(e);
      }}
      onDragStart={(e) => {
        if (isProtected) e.preventDefault();
        props.onDragStart?.(e);
      }}
      style={
        {
          ...(isProtected
            ? {
                userSelect: "none",
                WebkitUserSelect: "none",
                WebkitTouchCallout: "none",
              }
            : {}),
          ...props.style,
        } as React.CSSProperties
      }
    />
  );
};
