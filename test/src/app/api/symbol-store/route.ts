import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

/**
 * Same-origin proxy for the SVG sprite.
 *
 * SVG `<use href="…">` never resolves cross-origin, so when the sprite is hosted
 * on a different origin (a CDN, e.g. via Next's `assetPrefix`) the icons silently
 * break. Routing the reference through this same-origin handler sidesteps that:
 * `Icon` points at `/api/symbol-store#<id>` and this handler streams the sprite
 * from the same origin as the app.
 *
 * In this demo the sprite is read from disk (it also lives in /public for
 * simplicity). In a real CDN deployment, swap the filesystem read for a
 * server-side fetch of the CDN URL — server-side fetches are not subject to the
 * `<use>` cross-origin restriction:
 *
 *   const res = await fetch("https://cdn.example.com/symbolstore.svg");
 *   const svg = await res.text();
 *
 * The on-disk filename may carry a content hash (`symbolstore-<hash>.svg`, from
 * `symbol-store --hash`), so we resolve it from /public rather than hardcoding a
 * name — this route works whether or not `--hash` is used.
 *
 * Caching: this endpoint has a STABLE URL (the helper intentionally doesn't bake
 * a hash into `/api/symbol-store`), so its contents are mutable and must NOT be
 * served `immutable` — that would pin returning visitors to a stale sprite for up
 * to a year after a redeploy with new icons. Instead we attach a content `ETag`
 * and revalidate: an unchanged sprite comes back as a cheap `304 Not Modified`,
 * and an icon update is picked up on the very next request.
 */
async function resolveSpriteFile(publicDir: string): Promise<string | null> {
  const entries = await readdir(publicDir);
  // Matches `symbolstore.svg` and a hashed `symbolstore-<hash>.svg`.
  return entries.find((f) => /^symbolstore(-[0-9a-f]+)?\.svg$/.test(f)) ?? null;
}

export async function GET(request: Request) {
  const publicDir = path.join(process.cwd(), "public");
  const spriteFile = await resolveSpriteFile(publicDir);

  if (!spriteFile) {
    return new NextResponse("Sprite not found", { status: 404 });
  }

  const svg = await readFile(path.join(publicDir, spriteFile), "utf-8");

  const etag = `"${createHash("sha256").update(svg).digest("hex").slice(0, 16)}"`;
  const cacheControl = "public, max-age=0, must-revalidate";

  if (request.headers.get("if-none-match") === etag) {
    return new NextResponse(null, {
      status: 304,
      headers: { ETag: etag, "Cache-Control": cacheControl },
    });
  }

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": cacheControl,
      ETag: etag,
    },
  });
}
