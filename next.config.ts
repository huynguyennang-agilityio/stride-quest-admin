import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The image upload goes through a Server Action: 5 MB of file plus the multipart framing
  // (the default limit is 1 MB).
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
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
