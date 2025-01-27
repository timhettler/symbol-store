#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { Command } from "commander";
import {
  getSvgDataFromFile,
  getSVGSprite,
  getSvgSymbolFromFile,
} from "../lib/index.ts";
import { optimizeSvg } from "../lib/utils/optimizeSvg.ts";
import info from "../package.json" with { type: "json" };

const program = new Command();
program.name(info.name).description(info.description).version(info.version);

program
  .requiredOption("-i, --input <type>", "Path containing svg files")
  .option(
    "-o, --output <type>",
    "Path to output the combined SVG (defaults to input path)"
  )
  .option(
    "-t, --typescript-output [type]",
    "create a TypeScript helper file with optional output path (defaults to output path)"
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

const symbolDefinitions = fs
  .readdirSync(input)
  .filter((file) => file.endsWith(".svg"))
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

fs.writeFileSync(path.resolve(output, "symbolstore.svg"), svg);

// Use getSvgDataFromFile to get the ID of every SVG in a directory and output them to a typescript file containing an array of strings
const svgFiles = fs.readdirSync(input).filter((file) => file.endsWith(".svg"));
const svgIds = svgFiles.map((file) => {
  const { id } = getSvgDataFromFile(path.resolve(input, file));
  return id;
});

if (typescriptOutput) {
  const template = `import React from "react";

export const SYMBOL_IDS = <!-- SYMBOL_ID_ARRAY --> as const;
export type SYMBOL_IDS = typeof SYMBOL_IDS[number];

interface UseProps extends React.SVGProps<SVGSVGElement> {
  node: SYMBOL_IDS;
}

export const UseSvg = ({ node, ...props }: UseProps) => (
  <svg {...props}>
    <use href={\`/symbolstore.svg#\${node}\`} />
  </svg>
);`;

  const ReactComponent = template.replace(
    "<!-- SYMBOL_ID_ARRAY -->",
    JSON.stringify(svgIds)
  );

  if (!fs.existsSync(typescriptOutput)) {
    fs.mkdirSync(typescriptOutput, { recursive: true });
  }

  fs.writeFileSync(
    path.resolve(typescriptOutput, "UseSvg.tsx"),
    ReactComponent
  );
}
