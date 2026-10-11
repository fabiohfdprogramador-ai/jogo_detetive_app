import path from "node:path";
import type { NextConfig } from "next";

/**
 * GITHUB_PAGES=true gera um site 100% estático em ./out, publicado em
 * https://<usuario>.github.io/jogo_detetive_app/ (ver .github/workflows/deploy-pages.yml).
 */
const isPages = process.env.GITHUB_PAGES === "true";
const basePath = isPages ? (process.env.PAGES_BASE_PATH ?? "/jogo_detetive_app") : "";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Fixa a raiz do projeto mesmo que exista outro package-lock.json em pastas acima.
  outputFileTracingRoot: path.join(__dirname),
  ...(isPages ? { output: "export" as const, trailingSlash: true, images: { unoptimized: true } } : {}),
  basePath,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;
