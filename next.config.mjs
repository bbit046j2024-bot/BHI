/** @type {import('next').NextConfig} */
const nextConfig = {
  // ─── Security headers ────────────────────────────────────────
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options",    value: "nosniff" },
          { key: "X-Frame-Options",           value: "DENY" },
          { key: "X-XSS-Protection",          value: "1; mode=block" },
          { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },

  // ─── Image optimisation ──────────────────────────────────────
  images: {
    formats: ["image/avif", "image/webp"],
    // Add external domains here if you serve images from a CDN
    // domains: ["your-cdn.com"],
  },

  // ─── Compiler options ────────────────────────────────────────
  compiler: {
    // Remove console.log in production builds only
    removeConsole: process.env.NODE_ENV === "production"
      ? { exclude: ["error", "warn"] }
      : false,
  },

  // ─── Experimental ────────────────────────────────────────────
  experimental: {
    // Optimise heavy packages so they aren't bundled into the client chunk
    optimizePackageImports: ["@clerk/nextjs"],
    // Prevent server-only Node.js built-ins from leaking to the client (Next.js 14 key)
    serverComponentsExternalPackages: ["fs", "path"],
  },
};

export default nextConfig;
