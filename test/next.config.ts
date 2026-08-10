import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next.js does not add long-lived cache headers to files in `public/` (only
  // assets under `/_next/static/` are served `immutable`). These rules make the
  // sprite's caching explicit. See the README "Caching" section for the why.
  async headers() {
    return [
      // Content-hashed sprites — generated with `--hash`, e.g.
      // `symbolstore-1a2b3c4d.svg` — change their filename whenever their bytes
      // change, so they are safe to serve `immutable`: returning visitors fetch
      // the new file automatically after a redeploy.
      {
        source: "/:sprite(symbolstore-[0-9a-f]+\\.svg)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      // This demo ships the stable `symbolstore.svg` filename (no `--hash`).
      // That URL is mutable, so it must NOT be `immutable` — otherwise an icon
      // update would never reach returning visitors. Revalidate instead.
      {
        source: "/symbolstore.svg",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
