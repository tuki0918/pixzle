import React, { useEffect } from "react";
import { type UsePixzleImageProps, usePixzleImage } from "./usePixzleImage";

interface PixzleImageBaseProps
  extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src" | "onError"> {
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
  /**
   * Callback called when an error occurs during image restoration.
   */
  onError?: (error: Error) => void;
}

export type PixzleImageProps = PixzleImageBaseProps & UsePixzleImageProps;

export const PixzleImage = React.forwardRef<HTMLImageElement, PixzleImageProps>(
  (props, ref) => {
    const {
      image,
      alt = "",
      fallback = null,
      errorFallback = null,
      protected: isProtected = true,
      onError,
      // Extract variant-specific props to exclude from imgProps
      blockSize: _blockSize,
      seed: _seed,
      imageInfo: _imageInfo,
      manifest: _manifest,
      manifestData: _manifestData,
      ...imgProps
    } = props;

    const { src, isLoading, error } = usePixzleImage(props);

    useEffect(() => {
      if (error) {
        console.error("PixzleImage restoration error:", error);
        onError?.(error);
      }
    }, [error, onError]);

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

    if (isLoading || !src) {
      return <>{fallback}</>;
    }

    // biome-ignore lint/a11y/useAltText: alt is passed via props or defaults to empty string
    return (
      <img
        ref={ref}
        src={src}
        alt={alt}
        {...imgProps}
        onContextMenu={(e) => {
          if (isProtected) e.preventDefault();
          imgProps.onContextMenu?.(e);
        }}
        onDragStart={(e) => {
          if (isProtected) e.preventDefault();
          imgProps.onDragStart?.(e);
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
            ...imgProps.style,
          } as React.CSSProperties
        }
      />
    );
  },
);

PixzleImage.displayName = "PixzleImage";
