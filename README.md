# pixzle

![](.docs/figure.png)

This npm package provides functionality for image fragmentation and restoration.

## Packages

Please refer to each package's README for usage instructions.

- [Node.js](./packages/node/README.md)
- [Browser](./packages/browser/README.md) (restore only)
- [React](./packages/react/README.md) (restore only)
- [CLI](./packages/cli/README.md)

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

| Original | Fragmented | Restored |
|:---:|:---:|:---:|
| ![](.docs/input_sample.png) | ![](.docs/output_8.png) | ![](.docs/restored1/img_1.png) |

### List by blockSize

You can change the block size with `-b` or `--block-size <number>`.

| input | blockSize: 1 | blockSize: 2 | blockSize: 3 | blockSize: 4 |
|:-------:|:---------------:|:---------------:|:---------------:|:----------------:|
| ![](.docs/input_sample.png) | Error - Maximum call stack size exceeded | ![](.docs/output_2.png) | ![](.docs/output_3.png) | ![](.docs/output_4.png) |

| blockSize: 8 (default) | blockSize: 16 | blockSize: 32 | blockSize: 50 | blockSize: 128 |
|:-------:|:---------------:|:---------------:|:---------------:|:----------------:|
| ![](.docs/output_8.png) | ![](.docs/output_16.png) | ![](.docs/output_32.png) | ![](.docs/output_50.png) | ![](.docs/output_128.png) |

> [!WARNING]
> - May cause memory shortage depending on the number of  block size.
