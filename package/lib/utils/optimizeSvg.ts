import svgo from "svgo";

export function optimizeSvg(svgString: string) {
  const result = svgo.optimize(svgString, {
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
        name: "removeAttrs",
        params: {
          attrs: "(fill|stroke)",
        },
      },
    ],
  });
  return result.data;
}
