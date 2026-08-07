import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

/**
 * Same-origin proxy for the SVG sprite.
 *
 * SVG `<use href="…">` never resolves cross-origin, so when the sprite is hosted
 * on a different origin (a CDN, e.g. via Next's `assetPrefix`) the icons silently
 * break. Routing the reference through this same-origin handler sidesteps that:
 * `UseSvg` points at `/api/symbol-store#<id>` and this handler streams the sprite
 * from the same origin as the app.
 *
 * In this demo the sprite is read from disk (it also lives in /public for
 * simplicity). In a real CDN deployment, swap the filesystem read for a
 * server-side fetch of the CDN URL — server-side fetches are not subject to the
 * `<use>` cross-origin restriction:
 *
 *   const res = await fetch("https://cdn.example.com/symbolstore.svg");
 *   const svg = await res.text();
 */
export async function GET() {
  const spritePath = path.join(process.cwd(), "public", "symbolstore.svg");
  const svg = await readFile(spritePath, "utf-8");

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
