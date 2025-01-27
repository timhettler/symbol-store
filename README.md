# Symbol Store

An opinionated command-line tool to combine multiple SVG files into a single one that utilizes [`<symbol>`](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/symbol).

## Features

- Automatic SVG optimization using [SVGO](https://svgo.dev/)
- Removal of `fill` and `stroke` attributes so they may inherit from parent CSS.
- (Optional) Type-safe React component export.

## Motivation

For any years [SVGR](https://react-svgr.com/) has been the de facto solution for rendering SVGs in React apps. (Perhaps because it was bundle with Create React App.) However, after working on a production-facing website, high-traffic website for many years, I realized that importing SVGs one-by-one as React components have real performance issues, mainly:

- The SVG components can represent [a large percentage of your bundled script size](https://kurtextrem.de/posts/svg-in-js). (This can be confirmed by using - The SVG components can represent a large percentage of your bundled script size. (This can be confirmed by using )
  .)
- When rendered, the SVG components can add a huge amount of DOM nodes to your page. [Excessive DOM size can adversely affect your Lighthouse score](https://developer.chrome.com/docs/lighthouse/performance/dom-size).

There are other libraries that aim to solve the same problem, notably: [svgstore](https://github.com/svgstore/svgstore), [epic-stack-with-svg-sprites](https://github.com/kiliman/epic-stack-with-svg-sprites), and [@svg-use](https://github.com/fpapado/svg-use). The libraries are either out-of-date, or solve the problem in a different way than I prefer.

## When Should You Use This Library?

This library is most useful when you have a large number of monochrome SVGs to display on a website - perhaps in multiple places on a single page - and the fill color needs to be modified. That is to say, this library is for icons. Complex SVGs are outside the concerns of this library.

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

## References & Prior Art

- [svgstore](https://github.com/svgstore/svgstore)
- [epic-stack-with-svg-sprites](https://github.com/kiliman/epic-stack-with-svg-sprites)
- [@svguse](https://github.com/fpapado/svg-use/)
- [SVGR](https://react-svgr.com/)
- [Lambatest: Icon Fonts vs SVG – Clash of the Icons](https://www.lambdatest.com/blog/its-2019-lets-end-the-debate-on-icon-fonts-vs-svg-icons/)
- [Ben Adam: The "best" way to manage icons in React.js](https://benadam.me/thoughts/react-svg-sprites/)
- [CSS-Tricks: SVG symbol a Good Choice for Icons](https://css-tricks.com/svg-symbol-good-choice-icons/)
- [Jacob 'Kurt' Groß](https://kurtextrem.de/posts/svg-in-js)
