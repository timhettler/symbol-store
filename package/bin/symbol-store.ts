#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Command } from "commander";
import {
  getSvgDataFromFile,
  getSVGSprite,
  getSvgSymbolFromFile,
} from "../lib/index.ts";
import { optimizeSvg } from "../lib/utils/optimizeSvg.ts";
import pkg from "#root/package.json" with { type: "json" };

const program = new Command();
program.name(pkg.name).description(pkg.description).version(pkg.version);

program
  .requiredOption("-i, --input <type>", "Path containing svg files")
  .option(
    "-o, --output <type>",
    "Path to output the combined SVG (defaults to input path)"
  )
  .option(
    "-t, --typescript-output [type]",
    "create a TypeScript helper file with optional output path (defaults to output path)"
  )
  .option(
    "--hash",
    "append a short content hash to the combined SVG filename for cache-busting"
  )
  .option(
    "-r, --random-suffix",
    "deprecated alias for --hash (kept for backwards compatibility)"
  )
  .option(
    "-p, --proxy <type>",
    "URL to proxy SVG requests through (e.g., /api/sprite)"
  )
  .option(
    "--inline",
    "also emit a <SymbolStoreSprite> component and reference icons in-document (no proxy; works cross-origin)"
  );

program.parse();

const options = program.opts();
const input = options.input;
const output = options.output || options.input;
const typescriptOutput =
  options.typescriptOutput === undefined
    ? null
    : typeof options.typescriptOutput === "string"
      ? options.typescriptOutput
      : output;
if (options.inline && !typescriptOutput) {
  console.warn(
    "Warning: --inline has no effect without -t/--typescript-output — the <SymbolStoreSprite> component (and the in-document reference) are only emitted with a TypeScript output path."
  );
}

const useHashSuffix = options.hash || options.randomSuffix || false;

if (options.randomSuffix && !options.hash) {
  console.warn(
    "Warning: -r/--random-suffix is deprecated and now appends a deterministic content hash. Prefer --hash."
  );
}

// Sort before concatenating: `readdirSync` order is filesystem-dependent, so
// without this the sprite bytes (and therefore the content hash) could differ
// between machines (e.g. macOS vs. a Linux CI box) for identical icons.
const symbolDefinitions = fs
  .readdirSync(input)
  .filter((file) => file.endsWith(".svg"))
  .sort()
  .reduce((acc, file) => {
    acc += getSvgSymbolFromFile(path.resolve(input, file));
    return acc;
  }, "");

const svg = optimizeSvg(getSVGSprite(symbolDefinitions));

if (!svg) {
  throw new Error("SVG file is empty!");
}

if (!fs.existsSync(output)) {
  fs.mkdirSync(output, { recursive: true });
}

// A short content hash of the optimized sprite. Deterministic: identical icons
// always produce the same filename, and the name changes only when the sprite's
// bytes change — so a hashed file is safe to serve with a long-lived immutable
// cache and busts automatically when icons are updated.
const hashSuffix = useHashSuffix
  ? `-${crypto.createHash("sha256").update(svg).digest("hex").slice(0, 8)}`
  : "";

const spriteFilename = `symbolstore${hashSuffix}.svg`;
const spritePath = path.resolve(output, spriteFilename);
fs.writeFileSync(spritePath, svg);
console.log(`Wrote sprite → ${path.relative(process.cwd(), spritePath)}`);

// Use getSvgDataFromFile to get the ID of every SVG in a directory and output
// them to a typescript file containing an array of strings. Sorted so the
// generated SYMBOL_IDS order is stable across machines too.
const svgFiles = fs
  .readdirSync(input)
  .filter((file) => file.endsWith(".svg"))
  .sort();
const svgIds = svgFiles.map((file) => {
  const { id } = getSvgDataFromFile(path.resolve(input, file));
  return id;
});

if (typescriptOutput) {
  if (options.inline && options.proxy) {
    console.warn(
      "Warning: --inline overrides --proxy; inline icons resolve in-document (no proxy)."
    );
  }

  // Inline mode references the sprite in the *same document* (`#id`); otherwise
  // the reference points at the proxy endpoint or the on-disk sprite URL.
  const hrefPrefix = options.inline
    ? "#"
    : options.proxy
      ? `${options.proxy}#`
      : `/${spriteFilename}#`;

  const template = `import React from "react";

export const SYMBOL_IDS = <!-- SYMBOL_ID_ARRAY --> as const;
export type SYMBOL_IDS = typeof SYMBOL_IDS[number];

interface UseProps extends React.SVGProps<SVGSVGElement> {
  node: SYMBOL_IDS;
  /** Accessible name. Provided -> role="img" + <title>; omitted -> decorative. */
  title?: string;
}

/**
 * Renders an icon from the sprite.
 *
 * Decorative by default: hidden from assistive tech ("aria-hidden",
 * "focusable=false"). Pass a "title" to expose it as a meaningful image
 * ("role=img" with an accessible name and a <title> tooltip).
 */
export const UseSvg = ({ node, title, ...props }: UseProps) =>
  title ? (
    <svg role="img" aria-label={title} {...props}>
      <title>{title}</title>
      <use href={\`${hrefPrefix}\${node}\`} />
    </svg>
  ) : (
    <svg aria-hidden="true" focusable="false" {...props}>
      <use href={\`${hrefPrefix}\${node}\`} />
    </svg>
  );`;

  const ReactComponent = template.replace(
    "<!-- SYMBOL_ID_ARRAY -->",
    JSON.stringify(svgIds)
  );

  if (!fs.existsSync(typescriptOutput)) {
    fs.mkdirSync(typescriptOutput, { recursive: true });
  }

  const helperPath = path.resolve(typescriptOutput, "UseSvg.tsx");
  fs.writeFileSync(helperPath, ReactComponent);
  console.log(`Wrote helper → ${path.relative(process.cwd(), helperPath)}`);

  if (options.inline) {
    // Bake the sprite into a component that injects it into the document once.
    // Because `<use href="#id">` then resolves against the same document, this
    // works from any origin with no proxy — at the cost of one copy of the
    // sprite's definitions in the DOM (a fixed cost, not per-icon).
    const spriteComponent = `import React from "react";

const SPRITE = ${JSON.stringify(svg)};

/**
 * Injects the SVG sprite into the document so <use href="#id"> resolves against
 * the same document — no proxy, works cross-origin. Render this ONCE, high in
 * the tree (e.g. your root layout). It renders no visible output.
 */
export const SymbolStoreSprite: React.FC = () => (
  <div
    style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
    aria-hidden="true"
    dangerouslySetInnerHTML={{ __html: SPRITE }}
  />
);
`;

    const spriteComponentPath = path.resolve(
      typescriptOutput,
      "SymbolStoreSprite.tsx"
    );
    fs.writeFileSync(spriteComponentPath, spriteComponent);
    console.log(
      `Wrote inline sprite → ${path.relative(process.cwd(), spriteComponentPath)} (render <SymbolStoreSprite /> once, e.g. in your root layout)`
    );
  }

  if (options.proxy && useHashSuffix) {
    console.log(
      `Note: proxy "${options.proxy}" must serve the sprite file "${spriteFilename}".`
    );
  }
}
