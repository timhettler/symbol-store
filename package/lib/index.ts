import fs from "node:fs";
import path, { parse } from "node:path";
import { loadXml } from "./utils/loadXml.ts";

const SVG_TEMPLATE = `<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="position:absolute;width:0;height:0;overflow:hidden"><defs></defs></svg>`;

function getSymbolId(filePath: string): string {
  const name = parse(filePath).name;
  if (!name || /^\d/.test(name) || /\s/.test(name)) {
    throw new Error(
      `Invalid symbol ID: ${name}. IDs must contain at least one character, cannot start with a number, and must not contain whitespaces`
    );
  }

  return name;
}

function getSvgDataFromFile(filePath: string): {
  id: string;
  viewBox: string | undefined;
  content: string | null;
} {
  const svg = fs.readFileSync(path.resolve(filePath), "utf-8");
  const $svg = loadXml(svg);
  const $root = $svg("svg");
  const id = getSymbolId(filePath);
  const viewBox = $root.attr("viewBox");
  const content = $root.html();
  return { id, viewBox, content };
}

function getSvgSymbol(
  id: string,
  viewBox: string = "",
  content: string | null = ""
): string {
  return `<symbol id="${id}" viewBox="${viewBox}">${content}</symbol>`;
}

function getSvgSymbolFromFile(filePath: string): string {
  const { id, viewBox, content } = getSvgDataFromFile(filePath);
  return getSvgSymbol(id, viewBox, content);
}

function getSVGSprite(contents: string): string {
  const template = SVG_TEMPLATE;
  const $template = loadXml(template);
  $template("defs").html(contents);

  return $template.html();
}

export {
  getSymbolId,
  getSvgDataFromFile,
  getSvgSymbol,
  getSvgSymbolFromFile,
  getSVGSprite,
};
