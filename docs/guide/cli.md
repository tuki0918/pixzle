# CLI Usage

`@pixzle/cli` provides image fragmentation and restoration commands using `@pixzle/node`.

## Installation

```bash
npm install -g @pixzle/cli
```

## Shuffle

Fragments images into blocks and shuffles them.

```bash
pixzle shuffle <images...> -o <output_directory> [options]
```

| Option | Description | Required | Default |
| --- | --- | :---: | --- |
| `-o, --output <dir>` | Output directory | Yes | - |
| `-b, --block-size <number>` | Pixel block size | - | `8` |
| `-p, --prefix <prefix>` | Prefix for fragment files | - | `img` |
| `-s, --seed <seed>` | Random seed | - | Auto-generated 12-character ID |
| `--preserve-name` | Preserve original file names | - | `false` |
| `--cross-image-shuffle` | Shuffle blocks across all images | - | `false` |
| `--thumbnail` | Generate thumbnails for original images | - | `false` |
| `--thumbnail-size <px>` | Maximum thumbnail width and height | - | `100` |

```bash
pixzle shuffle input.png -o ./output
```

Generate thumbnails in `./output/thumbnails`:

```bash
pixzle shuffle input.png -o ./output --thumbnail --thumbnail-size 100
```

## Multiple Images

With `--cross-image-shuffle`, blocks are mixed across all input images instead of being shuffled independently within each image.

| input 1 | input 2 | input 3 |
| :---: | :---: | :---: |
| ![](/images/input_sample.png) | ![](/images/input_sample_mono.png) | ![](/images/input_sample_blue.png) |

| output 1 | output 2 | output 3 |
| :---: | :---: | :---: |
| ![](/images/output_m0.png) | ![](/images/output_m1.png) | ![](/images/output_m2.png) |

::: warning
Restoration with `--cross-image-shuffle` is currently only supported in Node.js and CLI environments.
:::

## Restore With Manifest

```bash
pixzle restore <fragments...> -m <manifest_path> -o <output_directory>
```

| Option | Description | Required |
| --- | --- | :---: |
| `-m, --manifest <path>` | Path to `manifest.json` | Yes |
| `-o, --output <dir>` | Output directory | Yes |

```bash
pixzle restore ./output/*.png -m ./output/manifest.json -o ./restored
```

## Restore With Manual Configuration

Restore a single image without a manifest file.

```bash
pixzle restore <fragment> -o <output_directory> -b <size> -s <seed> -w <width> -h <height>
```

| Option | Description | Required |
| --- | --- | :---: |
| `-o, --output <dir>` | Output directory | Yes |
| `-b, --block-size <number>` | Pixel block size | Yes |
| `-s, --seed <seed>` | Random seed | Yes |
| `-w, --width <number>` | Image width | Yes |
| `-h, --height <number>` | Image height | Yes |

```bash
pixzle restore ./fragmented.png -o ./restored -b 10 -s custom-seed -w 500 -h 500
```

## Manifest

```json
{
  "id": "631631d5-bcaa-40ac-9c1e-efd6e89e4600",
  "version": "0.0.0",
  "timestamp": "2025-12-04T16:08:41.924Z",
  "config": {
    "blockSize": 8,
    "prefix": "img",
    "seed": "4f90d13aBc42",
    "preserveName": false,
    "crossImageShuffle": false
  },
  "images": [
    {
      "w": 500,
      "h": 500
    }
  ]
}
```
