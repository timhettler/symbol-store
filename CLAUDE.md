# CLAUDE.md

Operational guidance for AI agents working in this repository. Keep it accurate — future agents rely on it.

## What this is

A Yarn 4 monorepo with two workspaces:

- **`package/`** — the published CLI **`@timhettler/symbol-store`**. Combines a folder of SVGs into a single `<symbol>` sprite and (optionally) generates a type-safe React `Icon` component. **This is the product.**
- **`test/`** — a Next.js demo app (workspace name **`symbol-store-demo`**, `private: true`). Exercises the CLI's output modes. Not published.

The CLI is a **build step, not a bundler plugin**: it emits plain files (`.svg` + `.tsx`), so it's bundler-agnostic (Turbopack / webpack / Vite / none). Output modes: default static file, `--proxy` (cross-origin/CDN), `--inline` (injects the sprite into the document). `--hash` gives content-hashed filenames for immutable caching.

## Commands (from repo root)

- `yarn build` — `turbo build` (compiles the package to `dist/`, builds the demo).
- `yarn test` — `turbo test` (type-check + mocha unit tests + CLI output test + demo sprite generation).
- `yarn lint` / `yarn dev`.
- Package only: `yarn workspace @timhettler/symbol-store <build|test|test:output>`.

Package manager is **Yarn 4.6.0 via Corepack** — run `corepack enable` first in fresh environments. `nodeLinker: node-modules`; CI installs with `yarn install --immutable`.

## Node version — read before running tests

Two different requirements, both intentional:

- **Dev/test toolchain needs Node ≥ 23.6** (`.nvmrc`). The unit tests (`mocha` over `.ts`) use native TypeScript type-stripping, and `@changesets/cli` needs it too. On older Node, `test:unit` and `changeset` fail to run.
- **The published package supports Node `>=18.20 <19 || >=20.10`.** The compiled `dist/` bin runs there; it uses a JSON import attribute (`with { type: "json" }`), which sets the 18.20/20.10 floor. CI's `compat` matrix proves this by running the compiled bin (`test:output`) on 18.20.0 / 20.10.0 / 22.

So on Node < 23.6 you can build and run the compiled CLI (`test:output`) but **not** the mocha suite — rely on CI for that.

## CI & releases

- **`.github/workflows/ci.yml`** (push/PR to `main`): `build-test` (full suite on 23.6) + a `compat` matrix (compiled CLI on 18.20.0 / 20.10.0 / 22).
- **`.github/workflows/release.yml`** (push to `main`): Changesets. Requires repo secrets **`NPM_TOKEN`** (npm automation token) and **`RELEASE_TOKEN`** (PAT with `repo` + `workflow` scopes, i.e. Contents write — needed to push tags and the Version PR).

**To cut a release:** `yarn changeset` (pick bump + summary) → merge to `main` → Changesets opens a **"Version Packages"** PR → merging that PR publishes to npm, pushes a tag, and creates a GitHub Release. Tags use the changesets monorepo format `@timhettler/symbol-store@X.Y.Z`.

**Do not bump `@changesets/cli` past `^2.x`.** v3.0.0 invokes `yarn npm publish --json`, which Yarn 4.6.0 rejects (`Unsupported option name --json`). It's pinned to `^2.31.1`.

## Conventions & gotchas

- **Branch off `main`; ship via PRs (merge commits, not squash).** Don't commit to `main` directly.
- **The demo workspace is named `symbol-store-demo`, not `next`.** A package literally named `next` collides with its own `next` dependency and breaks Changesets' validation. Don't rename it back.
- **Credentialed commands need the command sandbox disabled.** The sandbox blocks reads of `~/Library/Keychains` and `~/.npmrc`, so `git push`, `gh`, and `npm publish` fail inside it — run those with the sandbox off.
- **Published `files` is intentionally lean:** `dist/**/*.js` + `dist/**/*.d.ts` only (no `.ts` sources or source maps).
- **Snapshot tests:** `package/__test__/bin.spec.ts` (`EXPECTED_OUTPUT`) and `create.spec.ts` assert the exact sprite string. If you change `SVG_TEMPLATE` (`package/lib/index.ts`) or `optimizeSvg` (`package/lib/utils/optimizeSvg.ts`), run the CLI to capture the real SVGO output and update the snapshots.
- **Generated demo files** (`test/src/{simple,proxy,inline}/Icon.tsx`, `SymbolStoreSprite.tsx`, `test/public/symbolstore*.svg`) come from `yarn workspace symbol-store-demo generate:symbolstore`. Regenerate them when the CLI's output changes — don't hand-edit.
- `optimizeSvg` strips _colored_ `fill`/`stroke` but preserves `fill="none"`. The generated `Icon` is decorative by default (`aria-hidden`); a `title` prop switches it to `role="img"` + `<title>`.
- Known non-blocking `publint` warning: the tsc-emitted `dist/package.json` carries an `imports` field (used to resolve `#root/package.json` at runtime). Cosmetic.

## Key files

- `package/bin/symbol-store.ts` — CLI entry: options, sprite assembly, component generation.
- `package/lib/index.ts` — sprite/symbol construction, id (NCName) validation, `SVG_TEMPLATE`.
- `package/lib/utils/optimizeSvg.ts` — SVGO config.
- `test/src/app/api/symbol-store/route.ts` — demo proxy route (resolves the possibly-hashed sprite filename; ETag revalidation).
