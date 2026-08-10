import { ok } from "node:assert";
import { exec } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

// `--inline` should emit an in-document reference (`#id`) plus a self-contained
// <SymbolStoreSprite> component that injects the sprite (issue #5).
describe("Inline sprite mode (--inline)", function () {
  let outDir: string;

  before(function () {
    outDir = mkdtempSync(path.join(os.tmpdir(), "ss-inline-"));
  });
  after(function () {
    rmSync(outDir, { recursive: true, force: true });
  });

  it("references icons in-document and emits SymbolStoreSprite", function (done) {
    this.timeout(5000);

    const command = `./bin/symbol-store.ts -i ./__test__/icons -o "${outDir}" -t "${outDir}" --inline`;

    exec(command, async (error) => {
      if (error) {
        done(error);
        return;
      }

      const helper = await readFile(path.resolve(outDir, "Icon.tsx"), "utf-8");
      // In-document reference: `#id`, no file URL and no proxy path baked in.
      ok(
        helper.includes("`#${node}`"),
        "helper should reference the sprite in-document via #id"
      );
      ok(
        !helper.includes(".svg#") && !helper.includes("/api"),
        "inline helper should not bake a file/proxy URL into the reference"
      );

      const spritePath = path.resolve(outDir, "SymbolStoreSprite.tsx");
      ok(existsSync(spritePath), "SymbolStoreSprite.tsx should be emitted");

      const sprite = await readFile(spritePath, "utf-8");
      ok(
        sprite.includes("export const SymbolStoreSprite"),
        "should export SymbolStoreSprite"
      );
      ok(
        sprite.includes("dangerouslySetInnerHTML"),
        "SymbolStoreSprite should inject the sprite markup"
      );
      ok(
        sprite.includes("<symbol id="),
        "the sprite's <symbol> definitions should be baked into the component"
      );

      done();
    });
  });

  it("does not emit SymbolStoreSprite without --inline", function (done) {
    this.timeout(5000);

    // Use a fresh sub-directory so the previous test's output can't leak in.
    const plainDir = path.join(outDir, "no-inline");
    const command = `./bin/symbol-store.ts -i ./__test__/icons -o "${plainDir}" -t "${plainDir}"`;

    exec(command, (error) => {
      if (error) {
        done(error);
        return;
      }
      ok(
        existsSync(path.resolve(plainDir, "Icon.tsx")),
        "Icon.tsx should still be generated"
      );
      ok(
        !existsSync(path.resolve(plainDir, "SymbolStoreSprite.tsx")),
        "SymbolStoreSprite.tsx should only be written in --inline mode"
      );
      done();
    });
  });
});
