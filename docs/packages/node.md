# @pixzle/node

Node.js implementation of image fragmentation and restoration.

## Install

```bash
npm i @pixzle/node
```

## Shuffle

```ts
import pixzle from "@pixzle/node";

await pixzle.shuffle({
  images: ["./input_1.png", "./input_2.png", "./input_3.png"],
  outputDir: "./output/fragmented",
});
```

Output:

```txt
output
└── fragmented
    ├── img_1_fragmented.png
    ├── img_2_fragmented.png
    ├── img_3_fragmented.png
    └── manifest.json
```

| input 1 | input 2 | input 3 |
| :---: | :---: | :---: |
| ![](/images/input_sample.png) | ![](/images/input_sample_mono.png) | ![](/images/input_sample_blue.png) |

| output 1 | output 2 | output 3 |
| :---: | :---: | :---: |
| ![](/images/fragmented1/img_1_fragmented.png) | ![](/images/fragmented1/img_2_fragmented.png) | ![](/images/fragmented1/img_3_fragmented.png) |

## Restore

```ts
import pixzle from "@pixzle/node";

await pixzle.restore({
  manifest: "./output/fragmented/manifest.json",
  images: [
    "./output/fragmented/img_1_fragmented.png",
    "./output/fragmented/img_2_fragmented.png",
    "./output/fragmented/img_3_fragmented.png",
  ],
  outputDir: "./output/restored",
});
```

Output:

```txt
output
└── restored
    ├── img_1.png
    ├── img_2.png
    └── img_3.png
```

| restored 1 | restored 2 | restored 3 |
| :---: | :---: | :---: |
| ![](/images/restored1/img_1.png) | ![](/images/restored1/img_2.png) | ![](/images/restored1/img_3.png) |
