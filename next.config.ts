import type { NextConfig } from "next";

/**
 * 构建期可选内联环境变量。
 * - 构建时存在该变量 → 内联进服务端产物（适配只在构建阶段注入变量的平台）
 * - 构建时不存在 → 不内联，保留运行时 process.env 读取（适配只在运行时注入的平台）
 * 注意：仅内联服务端调用模型必需的变量；Supabase 相关变量不入内联，
 * 避免 SERVICE_ROLE_KEY 等敏感信息因模块共享被编译进浏览器产物。
 */
const buildEnv: Record<string, string> = {};
if (process.env.OPENAI_API_KEY) {
  buildEnv.OPENAI_API_KEY = process.env.OPENAI_API_KEY;
}
if (process.env.OPENAI_BASE_URL) {
  buildEnv.OPENAI_BASE_URL = process.env.OPENAI_BASE_URL;
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: buildEnv,
};

export default nextConfig;
