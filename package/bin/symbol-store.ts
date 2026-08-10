#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Command } from "commander";
import {
  getSvgDataFromFile,
  getSVGSprite,
  getSvgSymbol,
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

// Recursively collect every .svg under the input dir (nested folders included),
// in a deterministic (sorted) order.
function collectSvgFiles(dir: string): string[] {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      const full = path.resolve(dir, entry.name);
      if (entry.isDirectory()) return collectSvgFiles(full);
      if (entry.isFile() && entry.name.endsWith(".svg")) return [full];
      return [];
    })
    .sort();
}

// Exclude generated sprites (`symbolstore*.svg`) that live in the output dir
// from the input walk. With the default `-o` (output === input), or an output
// dir nested under the input, they would otherwise be read back in as icons —
// producing a bogus `symbolstore` symbol or a duplicate-id error.
const resolvedOutput = path.resolve(output);
const svgFiles = collectSvgFiles(input).filter(
  (file) =>
    !(
      path.dirname(file) === resolvedOutput &&
      /^symbolstore(-.+)?\.svg$/.test(path.basename(file))
    )
);

if (svgFiles.length === 0) {
  throw new Error(`No .svg files found in "${input}".`);
}

// Read + parse each file exactly once, and reject duplicate ids (symbol ids come
// from filenames, so the same basename in two folders would collide).
const seenIds = new Map<string, string>();
const parsedSvgs = svgFiles.map((filePath) => {
  const data = getSvgDataFromFile(filePath);
  const existing = seenIds.get(data.id);
  if (existing) {
    throw new Error(
      `Duplicate symbol id "${data.id}" from "${filePath}" and "${existing}". Symbol ids come from filenames and must be unique across all (nested) input folders.`
    );
  }
  seenIds.set(data.id, filePath);
  return data;
});

const symbolDefinitions = parsedSvgs
  .map(({ id, viewBox, content }) => getSvgSymbol(id, viewBox, content))
  .join("");

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

// Build the TypeScript helper's list of symbol ids from the already-parsed data.
const svgIds = parsedSvgs.map(({ id }) => id);

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

interface IconProps extends React.SVGProps<SVGSVGElement> {
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
export const Icon = ({ node, title, ...props }: IconProps) =>
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

  const helperPath = path.resolve(typescriptOutput, "Icon.tsx");
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
