import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const monorepoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

const nextConfig: NextConfig = {
  // Parent-directory lockfiles (for example a home-folder package-lock.json)
  // must not win over this pnpm workspace when inferring the Turbopack root.
  outputFileTracingRoot: monorepoRoot,
  turbopack: {
    root: monorepoRoot,
  },
};

export default nextConfig;
