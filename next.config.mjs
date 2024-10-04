/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  experimental: {
    taint: true,
  },
  webpack: (config, { isServer }) => {    
    config.resolve.alias["eccrypto"] = "crypto-browserify";
    // config.resolve.alias['buffer'] = "buffer/";
    config.externals.push("pino-pretty", "encoding");
    return config;
  },
};

export default nextConfig;
