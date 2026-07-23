/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactCompiler: true,
  logging: {
    incomingRequests: {
      ignore: [/\/share\//u, /\/api\/public\/property-shares\//u],
    },
  },
  async rewrites() {
    return [
      {
        source: "/privacy-policy",
        destination: "/privacy-policy.html",
      },
    ];
  },
  async headers() {
    const propertyShareHeaders = [
      {
        key: "Cache-Control",
        value: "private, no-store, max-age=0",
      },
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
    ];
    return [
      {
        source: "/share/:path*",
        headers: propertyShareHeaders,
      },
      {
        source: "/api/public/property-shares/:path*",
        headers: propertyShareHeaders,
      },
    ];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "milkywayy.s3.amazonaws.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "milkywayy-bookings.s3.amazonaws.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
