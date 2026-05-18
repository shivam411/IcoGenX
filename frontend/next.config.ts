import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin Turbopack to the frontend dir so it doesn't accidentally pick the
  // repo-root package-lock.json and resolve a different copy of `next`.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
