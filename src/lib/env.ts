import { z } from "zod";

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
    z.string().default("https://open.bigmodel.cn/api/paas/v4")
  ),
  SUPABASE_URL: z.preprocess(emptyToUndefined, z.string().optional()),
  SUPABASE_ANON_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  SUPABASE_SERVICE_ROLE_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
});

export type Env = z.infer<typeof envSchema>;

export function getEnv(): Env {
  return envSchema.parse(process.env);
}

/** 运行时获取大模型密钥，未配置时抛出明确错误 */
export function requireOpenAIKey(): string {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    throw new Error("OPENAI_API_KEY 未配置，请在环境变量中设置");
  }
  return key;
}
