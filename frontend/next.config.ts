import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://13.245.255.204/api/:path*",
      },
    ];
  },
};

export default nextConfig;