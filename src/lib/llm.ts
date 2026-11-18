import { ChatOpenAI } from "@langchain/openai";
import { getEnv } from "./env";

export function createLLM(options?: {
  model?: string;
  temperature?: number;
  streaming?: boolean;
}) {
  const env = getEnv();

  return new ChatOpenAI({
    apiKey: env.OPENAI_API_KEY,
    model: options?.model ?? "glm-4-flash",
    temperature: options?.temperature ?? 0.7,
    streaming: options?.streaming ?? true,
    configuration: {
      baseURL: env.OPENAI_BASE_URL,
    },
  });
}
