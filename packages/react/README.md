# @pixzle/react

React components for Pixzle.

## Installation

```bash
npm i @pixzle/react
```

## Usage

### PixzleImage

Single image restoration component.

```tsx
import { PixzleImage } from '@pixzle/react';

// Using manifest URL
const MyComponentWithManifest = () => {
  return (
    <PixzleImage
      manifest="https://example.com/manifest.json"
      image="https://example.com/fragment.png"
    />
  );
};

// Using manifest data
const MyComponentWithManifestData = () => {
  return (
    <PixzleImage
      manifestData={manifestData}
      image="https://example.com/fragment.png"
    />
  );
};

// Using explicit parameters
const MyComponent = () => {
  return (
    <PixzleImage
      blockSize={2}
      seed={72411}
      imageInfo={{ w: 500, h: 500 }}
      image="https://example.com/fragment.png"
    />
  );
};
```
