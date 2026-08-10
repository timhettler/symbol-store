import { ok } from "node:assert";
import { exec } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

// `--component-name` controls the generated component's name, props type, and
// filename; it defaults to `Icon` and must be a PascalCase identifier.
describe("Component name (--component-name)", function () {
  let outDir: string;

  before(function () {
    outDir = mkdtempSync(path.join(os.tmpdir(), "ss-cn-"));
  });
  after(function () {
    rmSync(outDir, { recursive: true, force: true });
  });

  it("defaults to Icon", function (done) {
    this.timeout(5000);

    const dir = path.join(outDir, "default");
    exec(
      `./bin/symbol-store.ts -i ./__test__/icons -o "${dir}" -t "${dir}"`,
      async (error) => {
        if (error) {
          done(error);
          return;
        }
        ok(
          existsSync(path.join(dir, "Icon.tsx")),
          "should generate Icon.tsx by default"
        );
        const helper = await readFile(path.join(dir, "Icon.tsx"), "utf-8");
        ok(helper.includes("export const Icon ="), "should export const Icon");
        done();
      }
    );
  });

  it("uses a custom name for the component, props type, and file", function (done) {
    this.timeout(5000);

    const dir = path.join(outDir, "custom");
    exec(
      `./bin/symbol-store.ts -i ./__test__/icons -o "${dir}" -t "${dir}" -c Glyph`,
      async (error) => {
        if (error) {
          done(error);
          return;
        }
        ok(existsSync(path.join(dir, "Glyph.tsx")), "should generate Glyph.tsx");
        ok(
          !existsSync(path.join(dir, "Icon.tsx")),
          "should not also generate the default Icon.tsx"
        );
        const helper = await readFile(path.join(dir, "Glyph.tsx"), "utf-8");
        ok(helper.includes("export const Glyph ="), "should export const Glyph");
        ok(
          helper.includes("interface GlyphProps"),
          "the props type should follow the component name"
        );
        done();
      }
    );
  });

  it("rejects a non-PascalCase name", function (done) {
    this.timeout(5000);

    const dir = path.join(outDir, "invalid");
    exec(
      `./bin/symbol-store.ts -i ./__test__/icons -o "${dir}" -t "${dir}" -c foo`,
      (error, _stdout, stderr) => {
        ok(error, "CLI should exit non-zero for an invalid component name");
        ok(
          /Invalid --component-name/.test(stderr),
          "should explain why the name is invalid"
        );
        done();
      }
    );
  });
});
