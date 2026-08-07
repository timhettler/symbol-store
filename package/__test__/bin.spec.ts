import { equal } from "node:assert";
import { exec } from "node:child_process";
import { existsSync, rmdirSync } from "node:fs";
import path from "node:path";
import { readFile, readdir } from "node:fs/promises";

const __dirname = path.dirname(new URL(import.meta.url).pathname);

const EXPECTED_OUTPUT = `<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="position:absolute;width:0;height:0;overflow:hidden"><defs><symbol id="Play" viewBox="0 0 32 32"><path d="M10 23.027c0 .755.845 1.222 1.508.833l5.962-3.489V11.63l-5.962-3.49c-.663-.388-1.508.079-1.508.834zm7.47-2.656 6.046-3.538a.96.96 0 0 0 0-1.666l-6.046-3.538z"/></symbol><symbol id="PlayWithFill" viewBox="0 0 32 32"><path d="M10 23.027c0 .755.845 1.222 1.508.833l5.962-3.489V11.63l-5.962-3.49c-.663-.388-1.508.079-1.508.834zm7.47-2.656 6.046-3.538a.96.96 0 0 0 0-1.666l-6.046-3.538z"/></symbol></defs></svg>`;

describe("Symbol Store CLI", function () {
  before(function () {
    const outDir = path.resolve(__dirname, "./out");
    if (existsSync(outDir)) {
      rmdirSync(outDir, { recursive: true });
    }
  });
  it("should create out files with expected content", function (done) {
    this.timeout(5000); // increase timeout to allow command to complete

    const command = `./bin/symbol-store.ts -i ./__test__/icons -o ./__test__/out -t ./__test__/out/react`;

    exec(command, async (error) => {
      if (error) {
        done(error);
        return;
      }

      const svgOutputPath = path.resolve(__dirname, "./out/symbolstore.svg");
      const expectedContent = EXPECTED_OUTPUT;

      const svgFileExists = existsSync(svgOutputPath);
      equal(svgFileExists, true, "SVG output file does not exist");

      if (svgFileExists) {
        const content = await readFile(svgOutputPath, "utf-8");
        equal(
          content.includes(expectedContent),
          true,
          "Output content is not as expected"
        );
      }

      const reactOutputPath = path.resolve(__dirname, "./out/react/UseSvg.tsx");
      const reactFileExists = existsSync(reactOutputPath);
      equal(reactFileExists, true, "React output file does not exist");

      done();
    });
  });

  it("should create matching references when using a content hash", function (done) {
    this.timeout(5000);

    const command = `./bin/symbol-store.ts -i ./__test__/icons -o ./__test__/out -t ./__test__/out/react --hash`;

    exec(command, async (error) => {
      if (error) {
        done(error);
        return;
      }

      // Find the generated SVG file with the content-hash suffix
      const outDir = path.resolve(__dirname, "./out");
      const svgFile = (await readdir(outDir)).find(
        (file) => file.startsWith("symbolstore-") && file.endsWith(".svg")
      );

      equal(!!svgFile, true, "Hashed SVG file not found");

      // The suffix is a lowercase-hex content hash, not a random number.
      const suffix = svgFile?.match(/-[0-9a-f]+/)?.[0];
      equal(!!suffix, true, "Hex content-hash suffix not found in SVG filename");

      // Read the React component file
      const reactContent = await readFile(
        path.resolve(__dirname, "./out/react/UseSvg.tsx"),
        "utf-8"
      );

      // Check if the reference matches
      const expectedReference = `/symbolstore${suffix}.svg#`;
      equal(
        reactContent.includes(expectedReference),
        true,
        "React component doesn't reference correct SVG filename"
      );

      done();
    });
  });

  it("should produce the same hashed filename for the same input (deterministic)", function (done) {
    this.timeout(8000);

    const command = `./bin/symbol-store.ts -i ./__test__/icons -o ./__test__/out --hash`;
    const outDir = path.resolve(__dirname, "./out");

    const hashedFile = async () =>
      (await readdir(outDir)).find(
        (file) => file.startsWith("symbolstore-") && file.endsWith(".svg")
      );

    exec(command, async (error) => {
      if (error) {
        done(error);
        return;
      }
      const first = await hashedFile();
      equal(!!first, true, "Hashed SVG file not found on first run");

      // Re-run with identical input; the content-addressed filename must not change.
      exec(command, async (error2) => {
        if (error2) {
          done(error2);
          return;
        }
        const second = await hashedFile();
        equal(
          second,
          first,
          "Identical input produced a different hashed filename"
        );
        done();
      });
    });
  });

  it("should use proxy URL in React component when provided", function (done) {
    this.timeout(5000);

    const command = `./bin/symbol-store.ts -i ./__test__/icons -o ./__test__/out -t ./__test__/out/react -p /api/sprite`;

    exec(command, async (error) => {
      if (error) {
        done(error);
        return;
      }

      const reactContent = await readFile(
        path.resolve(__dirname, "./out/react/UseSvg.tsx"),
        "utf-8"
      );

      const expectedReference = "/api/sprite#";
      equal(
        reactContent.includes(expectedReference),
        true,
        "React component doesn't use proxy URL"
      );

      done();
    });
  });

  it("should keep a stable proxy reference while writing a hashed sprite file when combining --proxy and --random-suffix", function (done) {
    this.timeout(5000);

    const command = `./bin/symbol-store.ts -i ./__test__/icons -o ./__test__/out -t ./__test__/out/react -p /api/sprite -r`;

    exec(command, async (error) => {
      if (error) {
        done(error);
        return;
      }

      // The on-disk sprite is written with the random suffix...
      const outDir = path.resolve(__dirname, "./out");
      const svgFile = (await readdir(outDir)).find(
        (file) => file.startsWith("symbolstore-") && file.endsWith(".svg")
      );
      equal(!!svgFile, true, "Hashed sprite file not found");

      // ...but the helper keeps the stable proxy endpoint (no hash baked in),
      // so the proxy route stays a fixed URL the consumer controls.
      const reactContent = await readFile(
        path.resolve(__dirname, "./out/react/UseSvg.tsx"),
        "utf-8"
      );
      equal(
        reactContent.includes("/api/sprite#"),
        true,
        "React component doesn't use the stable proxy URL"
      );
      equal(
        reactContent.includes(".svg#"),
        false,
        "Proxy helper should not bake a .svg filename into the reference"
      );

      done();
    });
  });
});
