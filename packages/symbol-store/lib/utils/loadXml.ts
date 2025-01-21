import * as cheerio from "cheerio";

const CHEERIO_OPTIONS = { xmlMode: true, recognizeSelfClosing: true };

export function loadXml(text: string) {
  return cheerio.load(text, CHEERIO_OPTIONS);
}
