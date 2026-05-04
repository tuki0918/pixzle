<div align="center">
  <img src="docs/public/images/icon.png" alt="pixzle Icon" width="128" height="128">
  <h1 align="center">pixzle</h1>
</div>

![](docs/public/images/figure.png)

This npm package provides functionality for image fragmentation and restoration.

Note: This does not guarantee strong security.

## Requirements

- Node >= 20

## Packages

See each package README for usage details.

| Platform | Package | Shuffle | Restore |
|------|-----------|:------:|:------:|
| [CLI](./packages/cli/README.md) | `@pixzle/cli` | ✅ | ✅ |
| [Node.js](./packages/node/README.md) | `@pixzle/node` | ✅ | ✅ |
| [Browser](./packages/browser/README.md) | `@pixzle/browser` | - | ✅ |
| [React](./packages/react/README.md) | `@pixzle/react` | - | ✅ |

## Clients

| Client | OS | Shuffle | Restore |
|------|------|:------:|:------:|
| App | `Mac` \| `Win` | ✅ | ✅ |
| [Raycast](https://github.com/tuki0918/pixzle-raycast) | `Mac` | ✅ | ✅ |

## Quick Start (CLI)

You can easily try image fragmentation using the CLI.

```bash
# Install CLI
npm install -g @pixzle/cli

# Shuffle images
pixzle shuffle input.png -o ./output

# Restore images
pixzle restore ./output/*.png -m ./output/manifest.json -o ./restored
```

## Shuffle Overview

### Result Example

| Fragmented | Restored |
|:---:|:---:|
| ![](docs/public/images/fragmented1/img_2_fragmented.png) | ![](docs/public/images/restored1/img_2.png) |
| ![](docs/public/images/fragmented1/img_3_fragmented.png) | ![](docs/public/images/restored1/img_3.png) |
| ![](docs/public/images/fragmented1/img_1_fragmented.png) | ![](docs/public/images/restored1/img_1.png) |

### List by blockSize

You can change the block size with `-b` or `--block-size <number>`.

| input | blockSize: 1 | blockSize: 2 | blockSize: 3 | blockSize: 4 |
|:-------:|:---------------:|:---------------:|:---------------:|:----------------:|
| ![](docs/public/images/input_sample.png) | ![](docs/public/images/output_1.png) | ![](docs/public/images/output_2.png) | ![](docs/public/images/output_3.png) | ![](docs/public/images/output_4.png) |

| blockSize: 8 (default) | blockSize: 16 | blockSize: 32 | blockSize: 50 | blockSize: 128 |
|:-------:|:---------------:|:---------------:|:---------------:|:----------------:|
| ![](docs/public/images/output_8.png) | ![](docs/public/images/output_16.png) | ![](docs/public/images/output_32.png) | ![](docs/public/images/output_50.png) | ![](docs/public/images/output_128.png) |

> [!WARNING]
> - May cause memory shortage depending on the value of block size.
