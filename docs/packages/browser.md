# @pixzle/browser

Browser implementation of pixzle image restoration.

## Install

```bash
npm i @pixzle/browser
```

## Restore a Single Image

```ts
import pixzle, { fetchManifest } from "@pixzle/browser";

const manifest = await fetchManifest("https://example.com/manifest.json");

const restoredBitmap = await pixzle.restoreImage({
  image: "https://example.com/fragment.png",
  blockSize: manifest.config.blockSize,
  seed: manifest.config.seed,
  imageInfo: manifest.images[0],
});

const canvas = document.createElement("canvas");
canvas.width = restoredBitmap.width;
canvas.height = restoredBitmap.height;

const ctx = canvas.getContext("2d");
ctx?.drawImage(restoredBitmap, 0, 0);
```

`image` can be a URL, `Blob`, `HTMLImageElement`, or `ImageBitmap`.

## Restore Multiple Images

```ts
import pixzle from "@pixzle/browser";

const restoredBitmaps = await pixzle.restore({
  images: ["https://example.com/fragment1.png", "https://example.com/fragment2.png"],
  manifest: "https://example.com/manifest.json",
});

for (const bitmap of restoredBitmaps) {
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;

  const ctx = canvas.getContext("2d");
  ctx?.drawImage(bitmap, 0, 0);
  document.body.appendChild(canvas);
}
```
