import svgo from "svgo";
import type { Config } from "svgo";

/**
 * Optimize a sprite/SVG string.
 *
 * Colored `fill` / `stroke` attributes are removed so icons inherit `color`
 * (or CSS) from their parent — but an explicit `fill="none"` is PRESERVED.
 * `fill="none"` marks intentionally unpainted regions (rings and holes,
 * outline-plus-fill pairs, even-odd cutouts drawn with an unfilled sub-path);
 * stripping it unconditionally lets the region inherit a color and visually
 * corrupts the icon. `stroke="none"` is likewise never removed here, though
 * SVGO may still drop it downstream since `none` is the SVG default for stroke.
 */
export function optimizeSvg(svgString: string) {
  const config: Config = {
    plugins: [
      {
        name: "preset-default",
        params: {
          overrides: {
            removeHiddenElems: false,
            removeUselessDefs: false,
          },
        },
      },
      {
        // Replaces the old `removeAttrs: (fill|stroke)`, which stripped these
        // attributes unconditionally. Only *colored* values are removed; `none`
        // is left in place so unpainted regions stay transparent.
        name: "removeColorFillStroke",
        fn: () => ({
          element: {
            enter: (node) => {
              for (const attr of ["fill", "stroke"] as const) {
                const value = node.attributes[attr];
                if (value !== undefined && value.trim().toLowerCase() !== "none") {
                  delete node.attributes[attr];
                }
              }
            },
          },
        }),
      },
    ],
  };

  const result = svgo.optimize(svgString, config);
  return result.data;
}
