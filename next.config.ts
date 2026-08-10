import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep firebase-admin out of the Turbopack/webpack server bundle on Vercel
  serverExternalPackages: ["firebase-admin"],
};

export default nextConfig;
