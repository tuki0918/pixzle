# @pixzle/node

Node.js implementation of image fragmentation and restoration.

## Installation

```bash
npm i @pixzle/node
```

## Usage

```ts
import Pixzle from "@pixzle/node";
```

**Shuffle**

```ts
await Pixzle.shuffle({
  // config: { /** FragmentationConfig */ },
  imagePaths: [
    "./input_1.png",
    "./input_2.png",
    "./input_3.png",
  ],
  outputDir: "./output/fragmented",
});
```

<details>
<summary>Output:</summary>

```
output
└── fragmented
    ├── img_1_fragmented.png
    ├── img_2_fragmented.png
    ├── img_3_fragmented.png
    └── manifest.json
```

| input 1 | input 2 | input 3 |
|:-------:|:---------------:|:---------------:|
| ![](../../.docs/input_sample.png) | ![](../../.docs/input_sample_mono.png) | ![](../../.docs/input_sample_blue.png) |
| 500 x 500px (109KB) | 400 x 600px (4KB) | 600 x 400px (3KB) |

| output 1 | output 2 | output 3 |
|:-------:|:---------------:|:---------------:|
| ![](../../.docs/fragmented1/img_1_fragmented.png) | ![](../../.docs/fragmented1/img_2_fragmented.png) | ![](../../.docs/fragmented1/img_3_fragmented.png) |
| 504 x 504px (159KB) | 496 x 488px (39KB) | 496 x 488px (35KB) |

</details>

**Restore**

```ts
await Pixzle.restore({
  manifestPath: "./output/fragmented/manifest.json",
  imagePaths: [
    "./output/fragmented/img_1_fragmented.png",
    "./output/fragmented/img_2_fragmented.png",
    "./output/fragmented/img_3_fragmented.png",
  ],
  outputDir: "./output/restored",
});
```

<details>
<summary>Output:</summary>

```
output
└── restored
    ├── img_1.png
    ├── img_2.png
    └── img_3.png
```

| input 1 | input 2 | input 3 |
|:-------:|:---------------:|:---------------:|
| ![](../../.docs/fragmented1/img_1_fragmented.png) | ![](../../.docs/fragmented1/img_2_fragmented.png) | ![](../../.docs/fragmented1/img_3_fragmented.png) |
| 504 x 504px (159KB) | 496 x 488px (39KB) | 496 x 488px (35KB) |

| output 1 | output 2 | output 3 |
|:-------:|:---------------:|:---------------:|
| ![](../../.docs/restored1/img_1.png) | ![](../../.docs/restored1/img_2.png) | ![](../../.docs/restored1/img_3.png) |
| 500 x 500px (116KB) | 400 x 600px (2KB) | 600 x 400px (2KB) |

</details>
