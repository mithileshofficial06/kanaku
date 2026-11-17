import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfjs-dist runs on the server for deterministic parsing; keep it out of the bundle.
  serverExternalPackages: ["pdfjs-dist"],
};

export default nextConfig;
