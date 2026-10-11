import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,

  // Allows Next.js development assets and client-side JavaScript to load when
  // the app is accessed through a tunnel (ngrok, Cloudflare Tunnel, ...).
  // Only applies to `next dev`; production builds ignore it.
  //
  // Set a comma-separated list in .env.local, for example:
  //   ALLOWED_DEV_ORIGINS=doorpost-slapstick-drainer.ngrok-free.dev,*.trycloudflare.com
  allowedDevOrigins:
    process.env.ALLOWED_DEV_ORIGINS?.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean) ?? [],

  images: {
    remotePatterns: [
      {
        // For authentication
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
      {
        // For Business
        protocol: "https",
        hostname:
          "business-freelancer-storage-972388989182-us-west-2-an.s3.us-west-2.amazonaws.com",
        pathname: "/businesses/**",
      },
      {
        // For icons
        protocol: "https",
        hostname:
          "business-freelancer-storage-972388989182-us-west-2-an.s3.us-west-2.amazonaws.com",
        pathname: "/social-icons/**",
      },
    ],
  },
};

export default nextConfig;
