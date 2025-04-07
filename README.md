# Symbol Store

An opinionated command-line tool to combine multiple SVG files into a single file that utilizes the [`<symbol>`](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/symbol) element.

## Features

- SVG optimization using [SVGO](https://svgo.dev/)
- Removal of `fill` and `stroke` attributes so they may inherit from parent CSS.
- (Optional) Type-safe React component export.

## Motivation

For many years [SVGR](https://react-svgr.com/) has been the de facto solution for rendering SVGs in React apps. (Perhaps because it was bundle with Create React App.) However, after working on production-facing, high-traffic websites for many years, I've realized that importing SVGs one-by-one as React components has real performance issues, mainly:

- The SVG components can represent [a large percentage of your bundled script size](https://kurtextrem.de/posts/svg-in-js). (This can be confirmed by using - The SVG components can represent a large percentage of your bundled script size. (This can be confirmed by using )
  .)
- When rendered, the SVG components can add a huge amount of DOM nodes to your page. [Excessive DOM size can adversely affect your Lighthouse score](https://developer.chrome.com/docs/lighthouse/performance/dom-size).

## When Should You Use This Library?

This library is most useful when you have a large number of monochrome SVGs to display on a website - perhaps in multiple places on a single page - and the fill color needs to be modified. That is to say, this library is for icons. Complex SVGs are outside the concerns of this library. For those types of SVGs, I recommend creating a separate process to optimize with SVGO and to import them on an ad-hoc basis.

> While stroke manipulation is possible, it is a best practice to export SVGs with "outlined strokes" so all files can be manipulated predictably.

## Installation

```shell
yarn add @timhettler/symbol-store
```

## Usage

```shell
symbol-store -i ./icons -o ./public -t ./src/components
```

## Options

Run `symbol-store -h` for details in your terminal.

| Option | Required | Description                     | Default     |
| ------ | -------- | ------------------------------- | ----------- |
| `-i`   | Y        | Path containing SVG files       | N/A         |
| `-o`   | N        | Path to output the combined SVG | Input path  |
| `-t`   | N        | Create a TypeScript file?       | Output path |
| `-r`   | N        | Add random suffix to filenames  | `false`     |
| `-p`   | N        | URL to proxy SVG requests       | N/A         |

## Cross-Origin Requests

The SVG `<use>` element does not work with cross-origin requests. If your symbol is hosted on a different domain than your application, you'll need to proxy the request. Here's an example using Next.js route handlers:

```shell
symbol-store -i ./icons -o ./public -t ./src/components -p /api/symbol-store
```

This will generate a React component that uses the proxy URL:

```typescript
export const UseSvg = ({ node, ...props }: UseProps) => (
  <svg {...props}>
    <use href={`/api/symbol-store#${node}`} />
  </svg>
);
```

You'll need to create a route handler to proxy the requests:

```typescript
// app/api/symbol-store/route.ts
import { NextResponse } from "next/server";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

export async function GET() {
  const isDev = process.env.NEXT_PHASE === PHASE_DEVELOPMENT_SERVER;

  const svgUrl = isDev
    ? "/symbolstore.svg"
    : "https://cdn.mydomain.com/symbolstore.svg";

  const res = await fetch(svgUrl);
  const svg = await res.text();

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=31536000",
    },
  });
}
```

## Preloading

Since the SVG symbol file is critical for rendering icons, it's recommended to preload it to avoid render-blocking requests. This is especially important if you're using a proxy endpoint, as the request will need to complete before any icons can be displayed.

### Next.js

Add the preload tag to your root layout:

```html
<head>
  <link rel="preload" href="/symbolstore.svg" as="image" type="image/svg+xml" />
</head>
```

If you're using a proxy endpoint, preload that instead:

```html
<head>
  <link
    rel="preload"
    href="/api/symbol-store"
    as="fetch"
    crossorigin="anonymous"
  />
</head>
```

> **Note:** Using `as="fetch"` instead of `as="image"` when preloading the proxy endpoint ensures the browser makes a single request that can be reused by the `<use>` elements.

## References & Prior Art

- [svgstore](https://github.com/svgstore/svgstore)
- [epic-stack-with-svg-sprites](https://github.com/kiliman/epic-stack-with-svg-sprites)
- [@svg-use](https://github.com/fpapado/svg-use/)
- [SVGR](https://react-svgr.com/)
- [Lambatest: Icon Fonts vs SVG – Clash of the Icons](https://www.lambdatest.com/blog/its-2019-lets-end-the-debate-on-icon-fonts-vs-symbol-stores/)
- [Ben Adam: The "best" way to manage icons in React.js](https://benadam.me/thoughts/react-svg-sprites/)
- [CSS-Tricks: SVG symbol a Good Choice for Icons](https://css-tricks.com/svg-symbol-good-choice-icons/)
- [Jacob 'Kurt' Groß](https://kurtextrem.de/posts/svg-in-js)
