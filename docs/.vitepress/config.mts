import { defineConfig } from "vitepress";

export default defineConfig({
  title: "pixzle",
  description:
    "Image fragmentation and restoration tools for CLI, Node.js, browser, and React.",
  base: "/pixzle/",
  cleanUrls: true,
  head: [
    ["link", { rel: "icon", href: "/pixzle/images/icon.png" }],
    ["meta", { property: "og:title", content: "pixzle" }],
    [
      "meta",
      {
        property: "og:description",
        content:
          "Image fragmentation and restoration tools for CLI, Node.js, browser, and React.",
      },
    ],
    [
      "meta",
      {
        property: "og:image",
        content: "https://tuki0918.github.io/pixzle/images/figure.png",
      },
    ],
  ],
  themeConfig: {
    logo: "/images/icon.png",
    nav: [
      { text: "Guide", link: "/guide/getting-started" },
      { text: "Packages", link: "/packages/cli" },
      { text: "GitHub", link: "https://github.com/tuki0918/pixzle" },
    ],
    sidebar: [
      {
        text: "Guide",
        items: [
          { text: "Getting Started", link: "/guide/getting-started" },
          { text: "CLI Usage", link: "/guide/cli" },
        ],
      },
      {
        text: "Packages",
        items: [
          { text: "@pixzle/cli", link: "/packages/cli" },
          { text: "@pixzle/node", link: "/packages/node" },
          { text: "@pixzle/browser", link: "/packages/browser" },
          { text: "@pixzle/react", link: "/packages/react" },
        ],
      },
    ],
    socialLinks: [
      { icon: "github", link: "https://github.com/tuki0918/pixzle" },
    ],
    search: {
      provider: "local",
    },
    footer: {
      message: "Released under the MIT License.",
      copyright: "Copyright (c) tuki0918",
    },
  },
});
