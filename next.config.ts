import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Mongoose does its own dynamic requires; keep it out of the server bundle.
  serverExternalPackages: ["mongoose"],
};

export default nextConfig;
