import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for the production Docker image (copies a minimal Node server).
  output: "standalone",
};

export default nextConfig;
