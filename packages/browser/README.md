# @pixzle/browser

Browser implementation of Pixzle image restoration.

## Installation

```bash
npm i @pixzle/browser
```

## Usage

```typescript
import { BrowserImageRestorer } from '@pixzle/browser';

const restorer = new BrowserImageRestorer();

const restoredBitmap = await restorer.restoreImage(
  'path/to/shuffled.png', // or URL, Blob, HTMLImageElement, ImageBitmap
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
