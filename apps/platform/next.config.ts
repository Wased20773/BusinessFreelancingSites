import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allows Next.js developement assets and client-side JavaScript to load
  // when the app is accessed through a temporary Cloudflare Tunnel URL.
  allowedDevOrigins: [
    "*.trycloudflare.com",
  ],
};

export default nextConfig;
