import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cover and medal images are Cloudinary delivery URLs.
  images: { remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }] },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
