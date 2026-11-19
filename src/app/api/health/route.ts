import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * 部署环境自检接口（不返回密钥明文，仅返回状态与指纹）。
 * 用于确认线上环境变量到底有没有被注入。
 */
export async function GET() {
  const buildHasKey = process.env.BUILD_OPENAI_KEY_PRESENT === "1";
  const key = process.env.OPENAI_API_KEY?.trim() ?? "";
  const baseUrl = process.env.OPENAI_BASE_URL?.trim() ?? "";

  const source = buildHasKey
    ? "build-inline"
    : key
    ? "runtime-env"
    : "none";

  return NextResponse.json({
    // 构建阶段是否读到 OPENAI_API_KEY
    buildHasKey,
    // 当前进程最终能否拿到可用的 key
    effectiveKey: key
      ? `${key.slice(0, 4)}***（${key.length} 字符）`
      : null,
    // 生效来源：build-inline=构建期内联 / runtime-env=运行时环境变量 / none=都没有
    source,
    baseUrl: baseUrl || "(使用代码默认值 https://open.bigmodel.cn/api/paas/v4)",
    nodeVersion: process.version,
  });
}
