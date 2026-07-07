/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow data/ directory to be read from server components
  // (no special config needed for fs.readFileSync — it works by default in Next.js 14)
  experimental: {},
};

export default nextConfig;
