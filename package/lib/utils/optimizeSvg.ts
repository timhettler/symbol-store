import svgo from "svgo";
import type { Config } from "svgo";

/**
 * Optimize a sprite/SVG string.
 *
 * Colored `fill` / `stroke` attributes are removed so icons inherit `color`
 * (or CSS) from their parent — but an explicit `fill="none"` is PRESERVED.
 * `fill="none"` marks intentionally unpainted regions (rings and holes,
 * outline-plus-fill pairs, even-odd cutouts drawn with an unfilled sub-path),
 * so keeping it lets those regions stay transparent rather than inherit a
 * color. `stroke="none"` is likewise left in place, though SVGO may still drop
 * it downstream since `none` is the SVG default for stroke.
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
        // Remove only *colored* fill/stroke values; leave `none` in place so
        // unpainted regions stay transparent.
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
