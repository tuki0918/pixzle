# Getting Started

pixzle provides tools for image fragmentation and restoration.

::: warning
This project does not guarantee strong security. Use it as an image transformation utility, not as encryption.
:::

## Requirements

- Node.js 20 or later

## Packages

| Platform | Package | Shuffle | Restore |
| --- | --- | :---: | :---: |
| CLI | `@pixzle/cli` | Yes | Yes |
| Node.js | `@pixzle/node` | Yes | Yes |
| Browser | `@pixzle/browser` | - | Yes |
| React | `@pixzle/react` | - | Yes |

## Quick Start

Install the CLI globally:

```bash
npm install -g @pixzle/cli
```

Shuffle an image:

```bash
pixzle shuffle input.png -o ./output
```

Restore the generated fragments with the manifest:

```bash
pixzle restore ./output/*.png -m ./output/manifest.json -o ./restored
```

## Output Example

| Fragmented | Restored |
| :---: | :---: |
| ![](/images/fragmented1/img_2_fragmented.png) | ![](/images/restored1/img_2.png) |
| ![](/images/fragmented1/img_3_fragmented.png) | ![](/images/restored1/img_3.png) |
| ![](/images/fragmented1/img_1_fragmented.png) | ![](/images/restored1/img_1.png) |

## Block Size

You can change the block size with `-b` or `--block-size <number>`.

| input | blockSize: 1 | blockSize: 2 | blockSize: 3 | blockSize: 4 |
| :---: | :---: | :---: | :---: | :---: |
| ![](/images/input_sample.png) | ![](/images/output_1.png) | ![](/images/output_2.png) | ![](/images/output_3.png) | ![](/images/output_4.png) |

| blockSize: 8 default | blockSize: 16 | blockSize: 32 | blockSize: 50 | blockSize: 128 |
| :---: | :---: | :---: | :---: | :---: |
| ![](/images/output_8.png) | ![](/images/output_16.png) | ![](/images/output_32.png) | ![](/images/output_50.png) | ![](/images/output_128.png) |

::: warning
Small block sizes and large image sets can increase memory usage.
:::
