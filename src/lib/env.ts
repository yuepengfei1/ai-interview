import { z } from "zod";
import { FALLBACK_OPENAI_API_KEY, FALLBACK_OPENAI_BASE_URL } from "./llm-key";

const emptyToUndefined = (v: unknown) => {
  if (typeof v !== "string") return v;
  const trimmed = v.trim();
  return trimmed === "" ? undefined : trimmed;
};

const envSchema = z.object({
  // 构建阶段（如收集页面数据）可能没有注入密钥，因此这里不做必填校验，
  // 真正调用模型时由 requireOpenAIKey() 在运行时校验。
  OPENAI_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  // 空字符串（部署平台上常见）也视为未配置，回退到智谱兼容地址
  OPENAI_BASE_URL: z.preprocess(
    emptyToUndefined,
    z.string().default(FALLBACK_OPENAI_BASE_URL)
  ),
  SUPABASE_URL: z.preprocess(emptyToUndefined, z.string().optional()),
  SUPABASE_ANON_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  SUPABASE_SERVICE_ROLE_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
});

export type Env = z.infer<typeof envSchema>;

export function getEnv(): Env {
  // 逐个显式读取 process.env.XXX，便于构建期被 next.config 的 env 内联替换
  return envSchema.parse({
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
}

/** 运行时获取大模型密钥：优先环境变量，其次服务端兜底值 */
export function requireOpenAIKey(): string {
  const key = process.env.OPENAI_API_KEY?.trim() || FALLBACK_OPENAI_API_KEY;
  if (!key) {
    throw new Error("OPENAI_API_KEY 未配置，且未提供兜底密钥");
  }
  return key;
}
