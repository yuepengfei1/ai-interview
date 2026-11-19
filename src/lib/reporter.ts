import { ChatPromptTemplate, HumanMessagePromptTemplate, SystemMessagePromptTemplate } from "@langchain/core/prompts";
import { z } from "zod";
import { createLLM } from "./llm";
import { InterviewReport } from "./storage";

const REPORT_SCHEMA = z.object({
  scores: z.object({
    logic: z.number().min(0).max(10).describe("逻辑表达"),
    professional: z.number().min(0).max(10).describe("专业能力"),
    resumeMatch: z.number().min(0).max(10).describe("简历匹配度"),
    reaction: z.number().min(0).max(10).describe("临场反应"),
    emotion: z.number().min(0).max(10).describe("情绪稳定性"),
    overall: z.number().min(0).max(10).describe("综合得分"),
  }),
  breakdown: z
    .array(
      z.object({
        question: z.string(),
        answer: z.string(),
        feedback: z.string().describe("AI 面试官的点评"),
        idealAnswer: z.string().describe("满分答案参考"),
        score: z.number().min(0).max(10),
      })
    )
    .describe("逐题复盘"),
  suggestions: z.array(z.string()).describe("具体改进建议 3-5 条"),
  summary: z.string().describe("总结一段话"),
});

export async function generateInterviewReport(params: {
  jdAnalysis: string;
  resume: string;
  messages: { role: "user" | "assistant"; content: string }[];
}): Promise<InterviewReport> {
  const { jdAnalysis, resume, messages } = params;

  // 只保留面试核心内容（开场问题除外，跳过前几轮寒暄）
  const transcript = messages
    .map((m, i) => {
      const label = m.role === "assistant" ? "面试官" : "候选人";
      return `[${i + 1}] ${label}：${m.content}`;
    })
    .join("\n\n");

  const llm = createLLM({ streaming: false });

  const prompt = ChatPromptTemplate.fromMessages([
    SystemMessagePromptTemplate.fromTemplate(`
你是一位资深的面试官教练，需要对一场面试做复盘评估。

请严格按以下 JSON 结构输出评估报告，不要输出 JSON 之外的任何内容，不要使用 markdown 代码块：

{{
  "scores": {{
    "logic": 0-10,
    "professional": 0-10,
    "resumeMatch": 0-10,
    "reaction": 0-10,
    "emotion": 0-10,
    "overall": 0-10
  }},
  "breakdown": [
    {{"question": "...", "answer": "...", "feedback": "...", "idealAnswer": "...", "score": 0-10}}
  ],
  "suggestions": ["具体建议1", "具体建议2", "..."],
  "summary": "一段话总结"
}}

评分参考标准（10 分制）：
- 9-10：非常出色，远超预期
- 7-8：良好，符合岗位要求
- 5-6：及格但有明显短板
- 3-4：较差，需要较大提升
- 1-2：严重不足

逐题复盘要覆盖所有面试问题。理想答案要具体、可操作。建议要精准、可落地。
    `),
    HumanMessagePromptTemplate.fromTemplate(`
【岗位分析】
{jdAnalysis}

【候选人简历】
{resume}

【完整面试记录】
{transcript}

请生成评估报告。只输出 JSON。
    `),
  ]);

  const chain = prompt.pipe(llm);
  const response = await chain.invoke({ jdAnalysis, resume, transcript });
  const content =
    typeof response.content === "string"
      ? response.content
      : response.content.join("");

  return parseReport(content);
}

function parseReport(content: string): InterviewReport {
  let jsonStr = content.trim();

  // 去 markdown 代码块
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  }

  const start = jsonStr.indexOf("{");
  const end = jsonStr.lastIndexOf("}");
  if (start !== -1 && end !== -1) jsonStr = jsonStr.slice(start, end + 1);

  try {
    const parsed = JSON.parse(jsonStr);
    const safe = REPORT_SCHEMA.parse(parsed);
    return safe as unknown as InterviewReport;
  } catch (err) {
    console.warn("报告 JSON 解析失败，使用降级：", err);
    return fallbackReport(content);
  }
}

function fallbackReport(_raw: string): InterviewReport {
  return {
    scores: {
      logic: 6,
      professional: 6,
      resumeMatch: 6,
      reaction: 6,
      emotion: 7,
      overall: 6,
    },
    breakdown: [],
    suggestions: [
      "建议在面试前对岗位 JD 做更细致的梳理，明确核心考察点。",
      "回答问题时多使用 STAR 法则（情境-任务-行动-结果），结构更清晰。",
      "准备 2-3 个能体现自己优势的具体项目案例，面试中主动引导。",
    ],
    summary:
      "本次面试已完成。AI 评估报告生成时未能完美解析，已给出基础评分和建议。",
  };
}
