import path from "node:path";
import type { NextConfig } from "next";

// cacheComponents / partialPrefetching (scaffold defaults) are intentionally off:
// the plan relies on route segment config (`dynamicParams = false`,
// `dynamic = 'force-dynamic'`), which is unavailable with Cache Components.
const nextConfig: NextConfig = {
  turbopack: {
    // Pin the root: a stray lockfile in a parent folder would otherwise be picked up.
    root: path.resolve(__dirname),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
