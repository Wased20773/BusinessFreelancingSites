import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,

  // Allows Next.js developement assets and client-side JavaScript to load
  // when the app is accessed through a temporary Cloudflare Tunnel URL.
  allowedDevOrigins: ["*.trycloudflare.com"],

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname:
          "business-freelancer-storage-972388989182-us-west-2-an.s3.us-west-2.amazonaws.com",
        pathname: "/social-icons/**",
      },
      {
        protocol: "https",
        hostname: "sso.pdx.edu",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
