/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone", // 配置为独立模式，通常用于容器化部署
  // output: "export", // 配置为独立模式，通常用于容器化部署

  images: {
    unoptimized: true, // 禁用优化
  },
  reactStrictMode: true, // 启用 React 严格模式
  webpack: (config, { isServer }) => {
    // 替换 eccrypto 为 crypto-browserify
    config.resolve.alias["eccrypto"] = "crypto-browserify";

    // 可选：增加其他 polyfill，比如 buffer 支持
    // config.resolve.alias["buffer"] = "buffer/";

    // 排除某些不需要打包的依赖
    config.externals.push("pino-pretty", "encoding");

    return config; // 返回修改后的 Webpack 配置
  },
  swcMinify: true, // 确保启用 SWC 压缩
  // concurrentFeatures: true,
  // fastRefresh: true,
  webpackDevMiddleware: (config) => {
    config.watchOptions = {
      ignored: /node_modules/, // 忽略 node_modules 文件夹
      poll: 1000, // 每秒检查一次文件变化
    };
    return config;
  },
  eslint: {
    ignoreDuringBuilds: true, // 禁用 ESLint 检查
  },
  typescript: {
    ignoreBuildErrors: true, // 禁用 TypeScript 类型检查
  },
  productionBrowserSourceMaps: false,
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? {
            exclude: ["error"],
          }
        : false,
  },
};

export default nextConfig;
