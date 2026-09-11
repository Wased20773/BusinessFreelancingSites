import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,

  // Allows Next.js developement assets and client-side JavaScript to load
  // when the app is accessed through a temporary Cloudflare Tunnel URL.
  // allowedDevOrigins: ["*.trycloudflare.com"],

  // Allows Next.js development assets and client-side JavaScript to load
  // when the app is accessed through a permanent generated NGrok URL.
  allowedDevOrigins: ["doorpost-slapstick-drainer.ngrok-free.dev"],

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
