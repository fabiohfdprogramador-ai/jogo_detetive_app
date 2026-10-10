import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Fixa a raiz do projeto mesmo que exista outro package-lock.json em pastas acima.
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
