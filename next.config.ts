import type { NextConfig } from "next";

/**
 * 构建期内联环境变量。
 * 目的：部分部署平台只在构建阶段注入环境变量，运行时 process.env 取不到，
 * 这里在构建时读取并写入产物，确保服务端代码运行时可用。
 * 注意：仅服务端代码引用这些变量，不会进入浏览器产物。
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: {
    // 只内联服务端调用模型必需的变量。
    // Supabase 相关变量不入内联，避免 SERVICE_ROLE_KEY 等敏感信息
    // 因模块共享被编译进浏览器产物。
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? "",
    OPENAI_BASE_URL: process.env.OPENAI_BASE_URL ?? "",
  },
};

export default nextConfig;
