import React, { useEffect, useImperativeHandle, useRef } from "react";
import { type UsePixzleImageProps, usePixzleImage } from "./usePixzleImage";

interface PixzleImageBaseProps
  extends Omit<React.CanvasHTMLAttributes<HTMLCanvasElement>, "onError"> {
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
  /**
   * Alternative text for the image.
   */
  alt?: string;
}

export type PixzleImageProps = PixzleImageBaseProps & UsePixzleImageProps;

export const PixzleImage = React.forwardRef<
  HTMLCanvasElement | null,
  PixzleImageProps
>((props, ref: React.ForwardedRef<HTMLCanvasElement | null>) => {
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
    ...canvasProps
  } = props;

  const { bitmap, isLoading, error } = usePixzleImage({
    ...props,
  });

  const internalCanvasRef = useRef<HTMLCanvasElement>(null);

  useImperativeHandle<HTMLCanvasElement | null, HTMLCanvasElement | null>(
    ref,
    () => internalCanvasRef.current,
  );

  useEffect(() => {
    if (bitmap && internalCanvasRef.current) {
      const canvas = internalCanvasRef.current;
      if (canvas.width !== bitmap.width) canvas.width = bitmap.width;
      if (canvas.height !== bitmap.height) canvas.height = bitmap.height;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(bitmap, 0, 0);
      }
    }
  }, [bitmap]);

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

  if (isLoading || !bitmap) {
    return <>{fallback}</>;
  }

  return (
    <canvas
      ref={internalCanvasRef}
      role="img"
      aria-label={alt}
      {...canvasProps}
      onContextMenu={(e) => {
        if (isProtected) e.preventDefault();
        canvasProps.onContextMenu?.(e);
      }}
      onDragStart={(e) => {
        if (isProtected) e.preventDefault();
        canvasProps.onDragStart?.(e);
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
          ...canvasProps.style,
        } as React.CSSProperties
      }
    >
      {alt}
    </canvas>
  );
});

PixzleImage.displayName = "PixzleImage";
