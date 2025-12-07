# @pixzle/browser

Browser implementation of Pixzle image restoration.

## Installation

```bash
npm i @pixzle/browser
```

## Usage

### Restore multiple images

```typescript
import pixzle from '@pixzle/browser';

const restoredBitmaps = await pixzle.restore({
  images: ['https://example.com/fragment1.png', 'https://example.com/fragment2.png'],
  manifest: 'https://example.com/manifest.json',
});

// Draw each restored image to canvas
restoredBitmaps.forEach((bitmap) => {
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0);
  document.body.appendChild(canvas);
});
```

### Restore a single image

```typescript
import pixzle, { fetchManifest } from '@pixzle/browser';

const manifest = await fetchManifest('https://example.com/manifest.json');

const restoredBitmap = await pixzle.restoreImage({
  image: 'https://example.com/fragment.png', // or Blob, HTMLImageElement, ImageBitmap
  blockSize: manifest.config.blockSize,
  seed: manifest.config.seed,
  imageInfo: manifest.images[0],
});

// Draw to canvas
const canvas = document.createElement('canvas');
canvas.width = restoredBitmap.width;
canvas.height = restoredBitmap.height;
const ctx = canvas.getContext('2d');
ctx.drawImage(restoredBitmap, 0, 0);
```
