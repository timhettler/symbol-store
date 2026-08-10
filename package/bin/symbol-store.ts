#!/usr/bin/env node

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
    "-r, --random-suffix",
    "append a random number to the combined SVG output filename"
  )
  .option(
    "-p, --proxy <type>",
    "URL to proxy SVG requests through (e.g., /api/sprite)"
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
const useRandomSuffix = options.randomSuffix || false;

// Generate random suffix once
const randomSuffix = useRandomSuffix
  ? `-${Math.floor(Math.random() * 10000)}`
  : "";

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

const spriteFilename = `symbolstore${randomSuffix}.svg`;
const spritePath = path.resolve(output, spriteFilename);
fs.writeFileSync(spritePath, svg);
console.log(`Wrote sprite → ${path.relative(process.cwd(), spritePath)}`);

// Build the TypeScript helper's list of symbol ids from the already-parsed data.
const svgIds = parsedSvgs.map(({ id }) => id);

if (typescriptOutput) {
  const proxyUrl = options.proxy
    ? `${options.proxy}#`
    : `/${spriteFilename}#`;

  const template = `import React from "react";

export const SYMBOL_IDS = <!-- SYMBOL_ID_ARRAY --> as const;
export type SYMBOL_IDS = typeof SYMBOL_IDS[number];

interface UseProps extends React.SVGProps<SVGSVGElement> {
  node: SYMBOL_IDS;
}

export const UseSvg = ({ node, ...props }: UseProps) => (
  <svg {...props}>
    <use href={\`${proxyUrl}\${node}\`} />
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

  if (options.proxy && useRandomSuffix) {
    console.log(
      `Note: proxy "${options.proxy}" must serve the sprite file "${spriteFilename}".`
    );
  }
}
