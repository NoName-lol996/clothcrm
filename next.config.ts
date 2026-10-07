import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // 关掉开发时右下角那个小圆标，正式上线也不会有
  devIndicators: false,
};

export default nextConfig;