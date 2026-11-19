import { NextResponse } from "next/server";
import { FALLBACK_OPENAI_API_KEY, FALLBACK_OPENAI_BASE_URL } from "@/lib/llm-key";

export const dynamic = "force-dynamic";

/**
 * 部署环境自检接口（不返回密钥明文，仅返回状态与指纹）。
 * 用于确认线上环境变量到底有没有被注入。
 */
export async function GET() {
  const buildHasKey = process.env.BUILD_OPENAI_KEY_PRESENT === "1";
  const envKey = process.env.OPENAI_API_KEY?.trim() ?? "";
  const key = envKey || FALLBACK_OPENAI_API_KEY;
  const baseUrl = process.env.OPENAI_BASE_URL?.trim() || FALLBACK_OPENAI_BASE_URL;

  const source = buildHasKey
    ? "build-inline"
    : envKey
    ? "runtime-env"
    : "fallback-embedded";

  return NextResponse.json({
    // 构建阶段是否读到 OPENAI_API_KEY
    buildHasKey,
    // 当前进程最终能否拿到可用的 key
    effectiveKey: key ? `${key.slice(0, 4)}***（${key.length} 字符）` : null,
    // 生效来源：build-inline / runtime-env / fallback-embedded
    source,
    baseUrl,
    nodeVersion: process.version,
  });
}
