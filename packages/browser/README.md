# @pixzle/browser

Browser implementation of Pixzle image restoration.

## Installation

```bash
npm i @pixzle/browser
```

## Usage

### Restore a single image

```typescript
import { ImageRestorer } from '@pixzle/browser';

const restorer = new ImageRestorer();

const restoredBitmap = await restorer.restoreImage(
  'path/to/fragmented/image.png', // or URL, Blob, HTMLImageElement, ImageBitmap
  8, // blockSize
  72411, // seed
  { w: 500, h: 500 } // imageInfo
);

// Draw to canvas
const canvas = document.createElement('canvas');
canvas.width = restoredBitmap.width;
canvas.height = restoredBitmap.height;
const ctx = canvas.getContext('2d');
ctx.drawImage(restoredBitmap, 0, 0);
```

### Restore multiple images

```typescript
import { ImageRestorer } from '@pixzle/browser';

const restorer = new ImageRestorer();

// Manifest data from the fragmentation process
const manifest = {
  id: 'abc123',
  version: '1.0.0',
  timestamp: '2025-01-01T00:00:00.000Z',
  config: {
    blockSize: 8,
    seed: 72411,
    prefix: 'img',
    preserveName: false,
    crossImageShuffle: false,
  },
  images: [
    { w: 500, h: 500 },
    { w: 800, h: 600 },
  ],
};

const restoredBitmaps = await restorer.restoreImages(
  ['fragment1.png', 'fragment2.png'], // or URL[], Blob[], HTMLImageElement[], ImageBitmap[]
  manifest
);

// Draw each restored image to canvas
restoredBitmaps.forEach((bitmap, index) => {
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0);
  document.body.appendChild(canvas);
});
```
