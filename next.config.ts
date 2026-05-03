import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PWA Configuration
  images: {
    unoptimized: true,
  },
  // Turbopack root configuration
  turbopack: {
    root: ".",
  },
  // Output configuration for static export if needed
  output: "standalone",
  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; connect-src 'self' https://*.upstash.io;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
