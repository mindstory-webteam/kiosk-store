/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      // Imported catalogue photographs are served from the source storefront's
      // CDN. Plain <img> tags don't need this, but next/image would.
      { protocol: "https", hostname: "cdn.shopify.com" },
    ],
  },
};

module.exports = nextConfig;