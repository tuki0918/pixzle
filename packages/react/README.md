# @pixzle/react

React components for Pixzle.

For examples, see [Storybook](https://main--6933042708fdfa4c737476b2.chromatic.com/).

## Installation

```bash
npm i @pixzle/react
```

## Usage

### PixzleImage

```tsx
import { PixzleImage } from '@pixzle/react';
```

### Using manifest URL

```tsx
<PixzleImage
  manifest="https://example.com/manifest.json"
  image="https://example.com/fragment.png"
/>
```

### Using manifest URL with multiple images

```tsx
{/* #1 */}
<PixzleImage
  manifest="https://example.com/manifest.json"
  image="https://example.com/fragment1.png"
  // imageIndex={0}
/>

{/* #2 */}
<PixzleImage
  manifest="https://example.com/manifest.json"
  image="https://example.com/fragment2.png"
  imageIndex={1}
/>

{/* #3 */}
<PixzleImage
  manifest="https://example.com/manifest.json"
  image="https://example.com/fragment3.png"
  imageIndex={2}
/>
```

### Using manifest data
```tsx
<PixzleImage
  manifestData={manifestData}
  image="https://example.com/fragment.png"
/>
```

### Using explicit parameters
```tsx
<PixzleImage
  blockSize={2}
  seed={72411}
  imageInfo={{ w: 500, h: 500 }}
  image="https://example.com/fragment.png"
/>
```
