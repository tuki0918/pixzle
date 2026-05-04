# @pixzle/react

React components for rendering restored pixzle images.

## Install

```bash
npm i @pixzle/react
```

## PixzleImage

```tsx
import { PixzleImage } from "@pixzle/react";
```

### Manifest URL

```tsx
<PixzleImage
  manifest="https://example.com/manifest.json"
  image="https://example.com/fragment.png"
/>
```

### Multiple Images

```tsx
<PixzleImage
  manifest="https://example.com/manifest.json"
  image="https://example.com/fragment1.png"
/>

<PixzleImage
  manifest="https://example.com/manifest.json"
  image="https://example.com/fragment2.png"
  imageIndex={1}
/>
```

### Manifest Data

```tsx
<PixzleImage manifestData={manifestData} image="https://example.com/fragment.png" />
```

### Explicit Parameters

```tsx
<PixzleImage
  blockSize={2}
  seed="custom-seed"
  imageInfo={{ w: 500, h: 500 }}
  image="https://example.com/fragment.png"
/>
```
