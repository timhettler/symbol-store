import { ok } from "node:assert";
import { exec } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

// Generated helper should carry sensible accessibility defaults (issue #10):
// decorative by default, and a labeled `role="img"` variant when `title` is set.
describe("Generated UseSvg accessibility defaults", function () {
  let outDir: string;

  before(function () {
    outDir = mkdtempSync(path.join(os.tmpdir(), "ss-a11y-"));
  });
  after(function () {
    rmSync(outDir, { recursive: true, force: true });
  });

  it("emits decorative defaults and a labeled role=img branch", function (done) {
    this.timeout(5000);

    const command = `./bin/symbol-store.ts -i ./__test__/icons -o "${outDir}" -t "${outDir}"`;

    exec(command, async (error) => {
      if (error) {
        done(error);
        return;
      }

      const helper = await readFile(path.resolve(outDir, "UseSvg.tsx"), "utf-8");

      // Decorative (no title): hidden from assistive tech.
      ok(
        helper.includes('aria-hidden="true"'),
        'decorative default should set aria-hidden="true"'
      );
      ok(
        helper.includes('focusable="false"'),
        'decorative default should set focusable="false"'
      );

      // Meaningful (title provided): exposed as an image with an accessible name.
      ok(helper.includes('role="img"'), "labeled branch should set role=img");
      ok(
        helper.includes("aria-label={title}"),
        "labeled branch should derive an accessible name from title"
      );
      ok(
        helper.includes("<title>{title}</title>"),
        "labeled branch should render a <title> element"
      );
      ok(
        helper.includes("title?: string"),
        "UseProps should declare an optional title"
      );

      done();
    });
  });
});
