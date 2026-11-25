import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    useTypeScriptCli: false,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.amazonaws.com' },
      { protocol: 'https', hostname: '**.s3.amazonaws.com' },
      { protocol: 'https', hostname: '**.s3.**.amazonaws.com' },
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'http', hostname: '127.0.0.1' },
    ],
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
    ];
  },
  async rewrites() {
    // API_PROXY_TARGET (server-side, e.g. https://hireos-api.bytemap.in) makes the browser
    // talk only to this origin: /api/v1/* is proxied to the backend, so auth cookies are
    // first-party. Without it (local dev) the browser calls the absolute NEXT_PUBLIC_API_URL.
    const proxyTarget = (process.env.API_PROXY_TARGET || "").replace(/\/$/, "");
    const backendOrigin =
      proxyTarget ||
      (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4012/api/v1").replace(/\/api\/v1\/?$/, "");
    return [
      ...(proxyTarget
        ? [{ source: "/api/v1/:path*", destination: `${proxyTarget}/api/v1/:path*` }]
        : []),
      { source: "/uploads/:path*", destination: `${backendOrigin}/uploads/:path*` },
    ];
  },
};

export default nextConfig;
