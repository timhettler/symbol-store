import { equal } from "node:assert";
import { exec } from "node:child_process";
import { existsSync, rmdirSync } from "node:fs";
import path from "node:path";
import { readFile } from "node:fs/promises";

const __dirname = path.dirname(new URL(import.meta.url).pathname);

const EXPECTED_OUTPUT = `<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="position:absolute;width:0;height:0;overflow:hidden"><defs><symbol id="Play" viewBox="0 0 32 32"><path d="M10 23.027c0 .755.845 1.222 1.508.833l5.962-3.489V11.63l-5.962-3.49c-.663-.388-1.508.079-1.508.834zm7.47-2.656 6.046-3.538a.96.96 0 0 0 0-1.666l-6.046-3.538z"/></symbol><symbol id="PlayWithFill" viewBox="0 0 32 32"><path d="M10 23.027c0 .755.845 1.222 1.508.833l5.962-3.489V11.63l-5.962-3.49c-.663-.388-1.508.079-1.508.834zm7.47-2.656 6.046-3.538a.96.96 0 0 0 0-1.666l-6.046-3.538z"/></symbol></defs></svg>`;

describe("Spritemap Maker CLI", function () {
  before(function () {
    const outDir = path.resolve(__dirname, "./out");
    if (existsSync(outDir)) {
      rmdirSync(outDir, { recursive: true });
    }
  });
  it("should create out files with expected content", function (done) {
    this.timeout(5000); // increase timeout to allow command to complete

    const command = `./bin/create.ts -i ./__test__/icons -o ./__test__/out -t ./__test__/out/react`;

    exec(command, async (error) => {
      if (error) {
        done(error);
        return;
      }

      const svgOutputPath = path.resolve(__dirname, "./out/spritemap.svg");
      const expectedContent = EXPECTED_OUTPUT;

      const svgFileExists = existsSync(svgOutputPath);
      equal(svgFileExists, true, "SVG output file does not exist");

      if (svgFileExists) {
        const content = await readFile(svgOutputPath, "utf-8");
        equal(
          content.includes(expectedContent),
          true,
          "Output content is not as expected",
        );
      }

      const reactOutputPath = path.resolve(__dirname, "./out/react/UseSvg.tsx");
      const reactFileExists = existsSync(reactOutputPath);
      equal(reactFileExists, true, "React output file does not exist");

      done();
    });
  });
});
