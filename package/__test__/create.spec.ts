import path from "node:path";
import { equal, throws } from "assert";
import {
  getSvgDataFromFile,
  getSVGSprite,
  getSvgSymbol,
  getSvgSymbolFromFile,
  getSymbolId,
} from "../lib/index.ts";

const __dirname = path.dirname(new URL(import.meta.url).pathname);

function removeLineBreaks(str: string): string {
  return str.replace(/\n/g, "");
}

describe("Create funtions", () => {
  it("creates valid Symbol ID", () => {
    equal(getSymbolId("foo"), "foo");
    equal(getSymbolId("foo-bar"), "foo-bar");
    equal(getSymbolId("foo_bar"), "foo_bar");
    equal(getSymbolId("foo!"), "foo!");
    equal(getSymbolId("foo1"), "foo1");
    throws(() => {
      getSymbolId("0foo");
    }, Error);
    throws(() => {
      getSymbolId("foo bar");
    }, Error);
  });
  it("creates SVG Symbol", () => {
    equal(
      getSvgSymbol("foo", "bar", "baz"),
      `<symbol id="foo" viewBox="bar">baz</symbol>`,
    );
  });

  it("get SVG data from file", () => {
    const { id, viewBox, content } = getSvgDataFromFile(
      path.resolve(__dirname, "./icons/Play.svg"),
    );
    equal(id, "Play");
    equal(viewBox, "0 0 32 32");
    equal(
      removeLineBreaks(content!),
      `<path d="M10 23.0271C10 23.7822 10.8446 24.2486 11.5084 23.8601L17.4699 20.3714V11.6286L11.5084 8.13993C10.8446 7.75145 10 8.21784 10 8.97292V23.0271ZM17.4699 20.3714L23.5164 16.833C24.1612 16.4557 24.1612 15.5443 23.5164 15.167L17.4699 11.6286V20.3714Z"/>`,
    );
  });

  it("creates SVG Symbol from file", () => {
    equal(
      removeLineBreaks(
        getSvgSymbolFromFile(path.resolve(__dirname, "./icons/Play.svg")),
      ),
      `<symbol id="Play" viewBox="0 0 32 32"><path d="M10 23.0271C10 23.7822 10.8446 24.2486 11.5084 23.8601L17.4699 20.3714V11.6286L11.5084 8.13993C10.8446 7.75145 10 8.21784 10 8.97292V23.0271ZM17.4699 20.3714L23.5164 16.833C24.1612 16.4557 24.1612 15.5443 23.5164 15.167L17.4699 11.6286V20.3714Z"/></symbol>`,
    );
  });

  it("creates SVG Sprite", () => {
    equal(
      removeLineBreaks(getSVGSprite("foo")),
      `<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="position:absolute;width:0;height:0;overflow:hidden"><defs>foo</defs></svg>`,
    );
  });
});
