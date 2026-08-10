import { ok } from "node:assert";
import { exec } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const ICON = `<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M0 0h16v16H0z"/></svg>`;

describe("Recursive input directory", function () {
  let root: string;

  before(function () {
    root = mkdtempSync(path.join(os.tmpdir(), "ss-dir-"));
  });
  after(function () {
    rmSync(root, { recursive: true, force: true });
  });

  it("collects icons from nested folders", function (done) {
    this.timeout(5000);

    const input = path.join(root, "icons");
    const out = path.join(root, "out");
    mkdirSync(path.join(input, "sub", "deep"), { recursive: true });
    writeFileSync(path.join(input, "alpha.svg"), ICON);
    writeFileSync(path.join(input, "sub", "beta.svg"), ICON);
    writeFileSync(path.join(input, "sub", "deep", "gamma.svg"), ICON);

    exec(
      `./bin/symbol-store.ts -i "${input}" -o "${out}" -t "${out}"`,
      async (error) => {
        if (error) {
          done(error);
          return;
        }
        const helper = await readFile(path.join(out, "Icon.tsx"), "utf-8");
        ok(
          helper.includes('"alpha"') &&
            helper.includes('"beta"') &&
            helper.includes('"gamma"'),
          "icons from nested folders should all appear in SYMBOL_IDS"
        );
        done();
      }
    );
  });

  it("ignores a previously-written sprite when output === input", function (done) {
    this.timeout(5000);

    // Simulate a prior run: an icon plus an already-generated sprite in the dir.
    const dir = path.join(root, "in-place");
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, "alpha.svg"), ICON);
    writeFileSync(path.join(dir, "symbolstore.svg"), ICON);

    exec(
      `./bin/symbol-store.ts -i "${dir}" -o "${dir}" -t "${dir}"`,
      async (error) => {
        if (error) {
          done(error);
          return;
        }
        const helper = await readFile(path.join(dir, "Icon.tsx"), "utf-8");
        ok(helper.includes('"alpha"'), "the real icon should be included");
        ok(
          !helper.includes('"symbolstore"'),
          "the generated sprite must not be re-globbed as an icon"
        );
        done();
      }
    );
  });

  it("errors on a duplicate id across folders", function (done) {
    this.timeout(5000);

    const input = path.join(root, "dupes");
    const out = path.join(root, "dup-out");
    mkdirSync(path.join(input, "a"), { recursive: true });
    mkdirSync(path.join(input, "b"), { recursive: true });
    writeFileSync(path.join(input, "a", "same.svg"), ICON);
    writeFileSync(path.join(input, "b", "same.svg"), ICON);

    exec(
      `./bin/symbol-store.ts -i "${input}" -o "${out}"`,
      (error, _stdout, stderr) => {
        ok(error, "CLI should exit non-zero on a duplicate id");
        ok(
          /[Dd]uplicate symbol id/.test(stderr),
          "CLI should report a duplicate-id error"
        );
        done();
      }
    );
  });
});
