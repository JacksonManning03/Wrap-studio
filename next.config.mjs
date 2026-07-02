/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow the app to be embedded in the operator's Webflow site via <iframe>.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors *" },
        ],
      },
    ];
  },
};
export default nextConfig;
