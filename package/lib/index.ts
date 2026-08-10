import fs from "node:fs";
import path, { parse } from "node:path";
import { loadXml } from "./utils/loadXml.ts";

const SVG_TEMPLATE = `<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="position:absolute;width:0;height:0;overflow:hidden"><defs></defs></svg>`;

// Valid XML NCName: starts with a letter or underscore, then letters, digits,
// hyphen, underscore, or period. This is what a `<use href="#id">` fragment can
// safely resolve against — it rejects leading digits, whitespace, and
// XML-invalid punctuation like `!` that would break the reference.
const NCNAME = /^[A-Za-z_][A-Za-z0-9._-]*$/;

function getSymbolId(filePath: string): string {
  const name = parse(filePath).name;
  if (!NCNAME.test(name)) {
    throw new Error(
      `Invalid symbol ID "${name}" (from ${filePath}). IDs must be a valid XML name: start with a letter or underscore, then only letters, digits, hyphen, underscore, or period — no spaces or other punctuation.`
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
  let viewBox = $root.attr("viewBox");
  if (!viewBox) {
    // No viewBox: derive one from width/height when possible so the symbol
    // scales predictably; otherwise warn.
    const width = $root.attr("width");
    const height = $root.attr("height");
    const w = width ? parseFloat(width) : NaN;
    const h = height ? parseFloat(height) : NaN;
    if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
      viewBox = `0 0 ${w} ${h}`;
    } else {
      console.warn(
        `Warning: "${filePath}" has no viewBox and no usable width/height to derive one. Its <symbol> may scale unpredictably.`
      );
    }
  }
  const content = $root.html();
  return { id, viewBox, content };
}

function getSvgSymbol(
  id: string,
  viewBox?: string,
  content: string | null = ""
): string {
  // Include the viewBox only when present (an empty `viewBox=""` is invalid).
  const viewBoxAttr = viewBox ? ` viewBox="${viewBox}"` : "";
  return `<symbol id="${id}"${viewBoxAttr}>${content}</symbol>`;
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
