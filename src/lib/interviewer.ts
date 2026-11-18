import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate,
} from "@langchain/core/prompts";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { createLLM } from "./llm";

/**
 * 一键初始化：分析 JD + 生成开场问题（一次 LLM 调用完成）
 */
export async function initInterview(
  jd: string,
  resume: string
): Promise<{ jdAnalysis: string; openingQuestions: string[] }> {
  const llm = createLLM({ streaming: false });

  const prompt = ChatPromptTemplate.fromMessages([
    SystemMessagePromptTemplate.fromTemplate(`
你同时扮演两个角色：资深 HR 招聘顾问 + 技术面试官。

请用严格的 JSON 格式一次性输出两项任务结果，不要输出任何 JSON 之外的内容，不要使用 markdown 代码块包裹。

输出的 JSON 必须长这样：
{{"jdAnalysis":"Markdown 格式的岗位分析，包含岗位名称、核心职责、硬技能、软技能、经验要求、面试考察重点","openingQuestions":["第一个问题","第二个问题","第三个问题"]}}

要求：
- jdAnalysis 字段用简洁的 Markdown 格式
- openingQuestions 是包含 3 个纯字符串的数组
- Q1 轻松友好，让候选人自我介绍
- Q2 结合 JD 要求考察匹配度
- Q3 结合简历亮点引导展开
- 只输出 JSON，不要其他文字
    `),
    HumanMessagePromptTemplate.fromTemplate(`
【岗位 JD】
{jd}

【候选人简历】
{resume}
    `),
  ]);

  const chain = prompt.pipe(llm);
  const response = await chain.invoke({ jd, resume });
  const content =
    typeof response.content === "string"
      ? response.content
      : response.content.join("");

  return parseInitResponse(content);
}

function parseInitResponse(content: string): {
  jdAnalysis: string;
  openingQuestions: string[];
} {
  // 先尝试直接解析
  let jsonStr = content.trim();

  // 去掉可能的 markdown 代码块
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  }

  // 提取第一个 { 到最后一个 } 之间的内容
  const startIdx = jsonStr.indexOf("{");
  const endIdx = jsonStr.lastIndexOf("}");
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    jsonStr = jsonStr.slice(startIdx, endIdx + 1);
  }

  try {
    const parsed = JSON.parse(jsonStr);
    if (typeof parsed.jdAnalysis === "string") {
      const questions = extractQuestions(parsed.openingQuestions);
      if (questions.length > 0) {
        return { jdAnalysis: parsed.jdAnalysis, openingQuestions: questions };
      }
    }
  } catch {
    // JSON 解析失败，走降级
  }

  // 降级：jdAnalysis 用原始内容，questions 用默认
  return {
    jdAnalysis: content,
    openingQuestions: [
      "请简单做一下自我介绍。",
      "你为什么对这个岗位感兴趣？",
      "你的项目经验中，最让你自豪的是哪个？",
    ],
  };
}

function extractQuestions(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const pickFields = ["question", "text", "content", "title", "prompt"];
  return raw
    .map((q: any) => {
      if (typeof q === "string") return q.trim();
      if (q && typeof q === "object") {
        for (const f of pickFields) {
          if (typeof q[f] === "string" && q[f].trim()) return q[f].trim();
        }
        // 最后兜底：把所有 string 字段拼起来
        const strs = Object.values(q).filter(
          (v) => typeof v === "string" && v.trim()
        ) as string[];
        if (strs.length) return strs.join(" ");
      }
      return "";
    })
    .filter((s) => s && s.length >= 3)
    .slice(0, 3);
}

/**
 * 面试追问链 - 核心流式生成逻辑
 */
export function createInterviewChain(
  jdAnalysis: string,
  resume: string,
  conversationHistory: { role: "user" | "assistant"; content: string }[]
) {
  const llm = createLLM({ streaming: true });

  const systemPrompt = `你是一位专业、犀利且富有洞察力的 AI 面试官。你的任务是基于岗位要求和候选人背景，进行一场高质量的技术面试。

## 你的角色：
- 面试官（Interviewer），用中文提问
- 风格：专业、直接、有深度
- 每次只问一个问题或给出一个简短评价后追问

## 面试规则：
1. 仔细分析候选人的回答，判断其真实水平
2. 针对回答中的亮点或疑点进行深挖追问
3. 如果候选人回答模糊，要求其给出具体案例
4. 适时给出反馈（如"很好"、"嗯"、"请继续"）
5. 避免重复已问过的问题
6. 根据面试进度逐步深入，从基础到进阶

## 岗位分析：
${jdAnalysis}

## 候选人简历：
${resume}

## 输出格式：
直接输出问题或追问，不需要前缀。例如：
- "请你具体描述一下这个项目的技术架构？"
- "你说的性能优化，具体做了哪些？"
- "好的，那接下来聊聊你对分布式系统的理解。"

现在开始面试。`;

  const messages = [
    new SystemMessage(systemPrompt),
    ...conversationHistory.map((m) =>
      m.role === "user"
        ? new HumanMessage(m.content)
        : new AIMessage(m.content)
    ),
  ];

  return llm.stream(messages);
}
