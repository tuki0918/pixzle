# @pixzle/react

React components for Pixzle.

## Installation

```bash
npm i @pixzle/react
```

## Usage

```tsx
import { PixzleImage } from '@pixzle/react';

const MyComponent = () => {
  return (
    <PixzleImage
      blockSize={2}
      seed={72411}
      imageInfo={ w: 500, h: 500 }
      image="path/to/shuffled/image.png"
    />
  );
};
```
