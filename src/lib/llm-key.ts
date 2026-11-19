/**
 * 服务端兜底密钥（仅服务端引用，切勿在客户端组件中 import 本文件）。
 * 用途：部署平台无法注入环境变量时，保证线上仍可调用模型。
 * 优先级：环境变量 > 这里的兜底值。密钥轮换时请同步修改此处。
 */
export const FALLBACK_OPENAI_API_KEY =
  "a3c6ebd84a594b88ae756b3d706b8a9e.KTq5qEEkgCJTlxLf";

export const FALLBACK_OPENAI_BASE_URL = "https://open.bigmodel.cn/api/paas/v4";
