# @pixzle/cli

CLI implementation of image fragmentation and restoration using the `@pixzle/node` library.

## Installation

```bash
npm install @pixzle/cli
```

## Usage

### Shuffle

Fragment images into multiple pieces.

```bash
pixzle shuffle <images...> -o <output_directory> [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `-o, --output <dir>` | Output directory (Required) | - |
| `-b, --block-size <number>` | Pixel block size | 8 |
| `-p, --prefix <prefix>` | Prefix for fragment files | "img" |
| `-s, --seed <seed>` | Random seed | auto |
| `--preserve-name` | Preserve original file names | false |
| `--cross-image-shuffle` | Shuffle blocks across all images | false |

**Example:**
```bash
pixzle shuffle input.png -o ./output
```

### Input multiple images

With `--cross-image-shuffle`, blocks are mixed across all input images, rather than being shuffled independently within each image.

| input 1 | input 2 | input 3 |
|:-------:|:---------------:|:---------------:|
| ![](../../.docs/input_sample.png) | ![](../../.docs/input_sample_mono.png) | ![](../../.docs/input_sample_blue.png) |

| output 1 | output 2 | output 3 |
|:-------:|:---------------:|:---------------:|
| ![](../../.docs/output_m0.png) | ![](../../.docs/output_m1.png) | ![](../../.docs/output_m2.png) |

> [!WARNING]
> - May cause memory shortage depending on the number of images and block size.


### Restore

Restore fragmented images.

#### Using Manifest

```bash
pixzle restore <fragments...> -m <manifest_path> -o <output_directory>
```

| Option | Description | Required |
|--------|-------------|----------|
| `-m, --manifest <path>` | Path to manifest.json | ✅ |
| `-o, --output <dir>` | Output directory | ✅ |

**Example:**
```bash
pixzle restore ./output/*.png -m ./output/manifest.json -o ./restored
```

#### Manual Configuration (Single Image)

Restore a single image without a manifest file.

```bash
pixzle restore <fragment> -o <output_directory> -b <size> -s <seed> -w <width> -h <height>
```

| Option | Description | Required |
|--------|-------------|----------|
| `-o, --output <dir>` | Output directory | ✅ |
| `-b, --block-size <number>` | Pixel block size | ✅ |
| `-s, --seed <number>` | Random seed | ✅ |
| `-w, --width <number>` | Image width | ✅ |
| `-h, --height <number>` | Image height | ✅ |

**Example:**
```bash
pixzle restore ./fragmented.png -o ./restored -b 10 -s 12345 -w 500 -h 500
```


## Manifest Structure

<details>
<summary>manifest.json</summary>

```json
{
  "id": "631631d5-bcaa-40ac-9c1e-efd6e89e4600",
  "version": "0.0.0",
  "timestamp": "2025-12-04T16:08:41.924Z",
  "config": {
    "blockSize": 8,
    "prefix": "img",
    "seed": 214448,
    "preserveName": false,
    "crossImageShuffle": false
  },
  "images": [
    {
      "w": 500,
      "h": 500
    },
    {
      "w": 400,
      "h": 600
    },
    {
      "w": 600,
      "h": 400
    }
  ]
}
```
</details>
