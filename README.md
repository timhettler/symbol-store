# Symbol Store

An opinionated command-line tool to combine multiple SVG files into a single file that utilizes the [`<symbol>`](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/symbol) element.

## Features

- SVG optimization using [SVGO](https://svgo.dev/)
- Removal of _colored_ `fill` and `stroke` attributes so they inherit from parent CSS — while preserving `fill="none"` so unpainted regions stay transparent.
- (Optional) Type-safe React component export.
- Bundler-agnostic: a standalone CLI build step, not a plugin — no loader config to maintain.

## Motivation

For many years [SVGR](https://react-svgr.com/) has been the de facto solution for rendering SVGs in React apps. (Perhaps because it was bundled with Create React App.) However, after working on production-facing, high-traffic websites for many years, I've realized that importing SVGs one-by-one as React components has real performance issues, mainly:

- The SVG components can represent [a large percentage of your bundled script size](https://kurtextrem.de/posts/svg-in-js).
- When rendered, the SVG components can add a huge amount of DOM nodes to your page. [Excessive DOM size can adversely affect your Lighthouse score](https://developer.chrome.com/docs/lighthouse/performance/dom-size).

## When Should You Use This Library?

This library is most useful when you have a large number of monochrome SVGs to display on a website - perhaps in multiple places on a single page - and the fill color needs to be modified. That is to say, this library is for icons. Complex SVGs are outside the concerns of this library. For those types of SVGs, I recommend creating a separate process to optimize with SVGO and to import them on an ad-hoc basis.

> While stroke manipulation is possible, it is a best practice to export SVGs with "outlined strokes" so all files can be manipulated predictably.

> **`fill="none"` is preserved.** Only _colored_ `fill`/`stroke` **attributes** are stripped (so the icon inherits `color`); an explicit `fill="none"` is left intact. Icons that rely on unpainted regions — rings, holes, outline-plus-fill pairs, even-odd cutouts — render correctly. (`stroke="none"` may still be dropped as redundant, since `none` is the SVG default for `stroke`. Colors set via inline `style` — e.g. `style="fill:#000"` — are not touched, so export flat `fill`/`stroke` attributes rather than inline styles.)

## A build step, not a plugin

Symbol Store is a standalone command-line tool: you run it and it writes a sprite file (and, optionally, a typed React helper) to disk. It isn't a bundler loader or plugin, so there's no loader configuration to maintain and nothing to wire into your bundler's module resolution.

The practical consequence is that it's **bundler-agnostic**. The generated `.svg` and `.tsx` are ordinary files — the sprite is referenced by URL, and the helper is a plain React component — so they behave identically whether your app is built with Turbopack, webpack, Vite, Rollup, or no bundler at all. Run it however suits your project — a `prebuild` script, another package script, or by hand — and consume the output like any other file.

## Installation

```shell
yarn add @timhettler/symbol-store
```

> **Node ≥ 18.20 or ≥ 20.10** is required to run the CLI (it uses JSON import attributes, which 19.x and 20.0–20.9 don't support).

## Usage

```shell
symbol-store -i ./icons -o ./public -t ./src/components
```

Icons in nested sub-folders are included too (the input directory is walked recursively). Symbol ids come from filenames, so a given name must be unique across all folders.

### Watching for changes

`symbol-store` is a one-shot build step — it doesn't watch. In development, re-run it whenever icons change with any file watcher, e.g. [`chokidar-cli`](https://github.com/open-cli-tools/chokidar-cli):

```shell
chokidar "icons/**/*.svg" -c "symbol-store -i ./icons -o ./public -t ./src/components"
```

Or run it next to your dev server with [`concurrently`](https://github.com/open-cli-tools/concurrently):

```json
"scripts": {
  "dev": "concurrently \"next dev\" \"chokidar 'icons/**/*.svg' -c 'symbol-store -i ./icons -o ./public -t ./src/components'\""
}
```

## Options

Run `symbol-store -h` for details in your terminal.

| Option   | Required | Description                                  | Default     |
| -------- | -------- | -------------------------------------------- | ----------- |
| `-i`     | Y        | Path containing SVG files                    | N/A         |
| `-o`     | N        | Path to output the combined SVG              | Input path  |
| `-t`     | N        | Create a TypeScript file?                    | Output path |
| `--hash` | N        | Append a content hash to the sprite filename | `false`     |
| `-r`     | N        | Deprecated alias for `--hash`                | `false`     |
| `-p`     | N        | URL to proxy SVG requests                    | N/A         |

The `--hash` suffix is a short, deterministic hash of the sprite's contents: the filename stays identical across builds and machines when the icons don't change, and changes only when they do. That makes a hashed sprite safe to serve with a long-lived [immutable cache](#caching) while still busting automatically after an icon update. (`-r` is kept as a deprecated alias — it used to append a random number.)

## Accessibility

The generated `UseSvg` component ships accessibility defaults so icons behave correctly without extra boilerplate on every usage.

**Decorative (default).** With no `title`, the icon is hidden from assistive technology (`aria-hidden="true"`, `focusable="false"`) — most icons sit beside a text label and shouldn't be announced twice:

```tsx
<UseSvg node="trash" /> // decorative: not announced
```

**Meaningful.** Pass a `title` to expose the icon as an image with an accessible name — it renders `role="img"`, an `aria-label`, and a `<title>` element (native tooltip):

```tsx
<UseSvg node="trash" title="Delete" /> // announced as "Delete"
```

`title` is the only prop added on top of the standard `SVGProps<SVGSVGElement>`. Because your props are spread after these defaults, you can still override `role` or any `aria-*` attribute when a specific case calls for it.

> **Icon-only controls need a name.** An icon that is the _only_ content of an interactive control — `<button><UseSvg node="trash" /></button>` — produces an **unnamed button**, because the decorative default hides the icon. Give the icon a `title`, or label the control itself (e.g. `aria-label` on the `<button>`). An empty `title=""` is treated as no title, so it stays decorative.

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

> Simplified for clarity — `--proxy` only changes the `<use>` reference. The real generated component also includes [accessibility defaults](#accessibility).

You'll need to create a route handler to proxy the requests:

```typescript
// app/api/symbol-store/route.ts
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

export async function GET(request: Request) {
  const isDev = process.env.NEXT_PHASE === PHASE_DEVELOPMENT_SERVER;

  // In development, read the sprite from ./public on disk. In production, fetch
  // it from your CDN — server-side fetches aren't subject to the `<use>`
  // cross-origin restriction that breaks the reference in the browser.
  const svg = isDev
    ? await readFile(
        path.join(process.cwd(), "public", "symbolstore.svg"),
        "utf-8"
      )
    : await fetch("https://cdn.mydomain.com/symbolstore.svg").then((res) =>
        res.text()
      );

  // This endpoint has a *stable* URL (`/api/symbol-store` — no hash is baked in),
  // so its contents are mutable and must NOT be served `immutable`: that would
  // pin returning visitors to a stale sprite for up to a year after a redeploy.
  // Attach a content ETag and revalidate instead — an unchanged sprite returns a
  // cheap 304, and an icon update is picked up on the next request.
  const etag = `"${createHash("sha256").update(svg).digest("hex").slice(0, 16)}"`;
  const cacheControl = "public, max-age=0, must-revalidate";

  if (request.headers.get("if-none-match") === etag) {
    return new NextResponse(null, {
      status: 304,
      headers: { ETag: etag, "Cache-Control": cacheControl },
    });
  }

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": cacheControl,
      ETag: etag,
    },
  });
}
```

> **Caching:** because the proxy URL is stable, don't mark it `immutable`. If you'd rather cache at the edge, `s-maxage` + `stale-while-revalidate` (e.g. `public, s-maxage=86400, stale-while-revalidate=604800`) is a good alternative that bounds staleness while still revalidating. The static (non-proxy) sprite can be hashed with [`--hash`](#options) and served `immutable`; see [Caching](#caching).

### Alternative: inline the sprite (no proxy)

If running a proxy isn't an option, the sprite can instead be **inlined** into the document: fetch it once and inject the `<symbol>` definitions into the DOM so `<use href="#icon">` resolves against the same document — which works from any origin, with no proxy required.

The trade-off is DOM size. Inlining adds one copy of the whole sprite's definitions to the page (a fixed cost, _not_ multiplied by how many icons you render), whereas the proxy keeps them in a separately-cached file and the page at just `<use>` references. That runs against the minimal-DOM goal described in [Motivation](#motivation), which is why the proxy is the default recommendation.

Inline output isn't built into the CLI yet — it's tracked in [#5](https://github.com/timhettler/symbol-store/issues/5).

## First paint

Because icons are referenced from an external file via `<use href="…">`, the browser must fetch the sprite before it can paint any icon — the glyphs aren't part of the server-rendered HTML. On a cold cache this means icons appear a moment after the rest of the page (a brief flash of no-icon), and the [proxy](#cross-origin-requests) can add a server round-trip (e.g. fetching from your CDN) in front of that request.

[Preloading](#preloading) the sprite largely mitigates this. For icons that must be visible immediately — above the fold, for example — inlining the sprite into the document avoids the extra request entirely; that mode is tracked in [#5](https://github.com/timhettler/symbol-store/issues/5).

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

> **Note:** In development (`next dev`) you may see a `"resource … was preloaded using link preload but not used within a few seconds"` warning for the sprite. This is a dev-mode / React StrictMode artifact — in a production build the preload is consumed by `<use>` (a single request, no double-fetch).

## Caching

Next.js doesn't add long-lived cache headers to files in `public/` — only assets under `/_next/static/` are served as `immutable`. By default the sprite is revalidated on navigation rather than cached for the long term.

You can cache it aggressively with a `headers()` rule in `next.config.ts`, **but only mark it `immutable` if its URL changes whenever its contents do** — otherwise returning visitors keep the stale sprite until the cache expires.

The safe way is to give the sprite a content-hashed filename (the `--hash` flag) and match that filename:

```ts
// next.config.ts
const nextConfig = {
  async headers() {
    return [
      {
        source: "/:sprite(symbolstore-[0-9a-f]+\\.svg)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

If you serve the stable `symbolstore.svg` filename instead (no `--hash`), don't mark it `immutable`; use a revalidating policy such as `public, max-age=0, must-revalidate` so icon updates are picked up on the next request.

The demo app's [`next.config.ts`](test/next.config.ts) shows both rules side by side: an `immutable` rule matching the hashed pattern, and a revalidating rule for the stable filename it actually ships.

## References & Prior Art

- [svgstore](https://github.com/svgstore/svgstore)
- [epic-stack-with-svg-sprites](https://github.com/kiliman/epic-stack-with-svg-sprites)
- [@svg-use](https://github.com/fpapado/svg-use/)
- [SVGR](https://react-svgr.com/)
- [Lambatest: Icon Fonts vs SVG – Clash of the Icons](https://www.lambdatest.com/blog/its-2019-lets-end-the-debate-on-icon-fonts-vs-symbol-stores/)
- [Ben Adam: The "best" way to manage icons in React.js](https://benadam.me/thoughts/react-svg-sprites/)
- [CSS-Tricks: SVG symbol a Good Choice for Icons](https://css-tricks.com/svg-symbol-good-choice-icons/)
- [Jacob 'Kurt' Groß](https://kurtextrem.de/posts/svg-in-js)
