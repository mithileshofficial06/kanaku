import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfjs-dist runs on the server for deterministic parsing; keep it out of the bundle.
  serverExternalPackages: ["pdfjs-dist"],
  // pdf.js loads its worker (pdf.worker.mjs) with a dynamic import that file tracing cannot see.
  // Without this, serverless deployments ship pdf.mjs alone and every PDF fails to open.
  outputFileTracingIncludes: {
    "/api/**/*": ["./node_modules/pdfjs-dist/legacy/build/**/*.mjs", "./node_modules/pdfjs-dist/package.json"],
  },
};

export default nextConfig;
