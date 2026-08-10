import { ok } from "node:assert";
import { optimizeSvg } from "../lib/utils/optimizeSvg.ts";

// Collect the values of a given attribute across the optimized output.
function attrValues(svg: string, attr: string): string[] {
  return [...svg.matchAll(new RegExp(`${attr}="([^"]*)"`, "g"))].map(
    (m) => m[1]!
  );
}

describe("optimizeSvg", () => {
  it('preserves fill="none" while stripping colored fills', () => {
    const input = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M2 2h20v20H2z" fill="none" stroke="#f00"/><circle cx="12" cy="12" r="5" fill="#000000"/></svg>`;
    const out = optimizeSvg(input);

    const fills = attrValues(out, "fill");
    ok(fills.length > 0, "expected at least one fill attribute to survive");
    ok(
      fills.every((v) => v === "none"),
      `only fill="none" should remain, got ${JSON.stringify(fills)}`
    );
    // The colored stroke must be gone (only "none" may remain, if any).
    ok(
      attrValues(out, "stroke").every((v) => v === "none"),
      "colored stroke should be removed"
    );
  });

  it('keeps fill="none" on an outline shape while dropping its colored stroke', () => {
    // A ring/outline: fill="none" must stay transparent; the colored stroke is
    // removed so the icon inherits `color`.
    const input = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="#000"/></svg>`;
    const out = optimizeSvg(input);

    ok(out.includes('fill="none"'), 'fill="none" should be preserved');
    ok(
      attrValues(out, "stroke").every((v) => v === "none"),
      "colored stroke should be removed"
    );
  });

  it("still strips colored fills so icons inherit color (the common case)", () => {
    const input = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="M10 10h12v12H10z" fill="black"/></svg>`;
    const out = optimizeSvg(input);
    ok(!/fill="/.test(out), "a single colored fill should be removed entirely");
  });
});
