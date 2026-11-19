import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { ChatPromptTemplate, HumanMessagePromptTemplate, SystemMessagePromptTemplate } from "@langchain/core/prompts";
import { createLLM } from "@/lib/llm";
import { buildInterviewSystemPrompt } from "@/lib/modes";
import { generateInterviewReport } from "@/lib/reporter";
import {
  InterviewMode,
  InterviewRecord,
  getInterview,
  newId,
  saveInterview,
} from "@/lib/storage";

// =======================================================
// POST /api/interview
//   action=init   -> 新建面试（解析 JD + 开场问题 + 持久化）
//   action=chat  -> 流式追问
//   action=end    -> 结束面试 + 生成报告
//   action=save   -> 手动保存当前状态
// =======================================================

const modeSchema = z.object({
  scenario: z.enum(["tech", "behavioral", "coding", "general"]).default("general"),
  pressure: z.enum(["gentle", "standard", "stress"]).default("standard"),
});

const historySchema = z
  .array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    })
  )
  .default([]);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const baseSchema = z.object({
      action: z.enum(["init", "chat", "end", "save"]),
      interviewId: z.string().optional(),
      jd: z.string().optional(),
      resume: z.string().optional(),
      jdAnalysis: z.string().optional(),
      mode: modeSchema.optional(),
      conversationHistory: historySchema,
    });

    const parsed = baseSchema.parse(body);
    const defaultMode: InterviewMode = { scenario: "general", pressure: "standard" };
    const mode = parsed.mode ?? defaultMode;

    // ========== INIT ==========
    if (parsed.action === "init") {
      if (!parsed.jd || !parsed.resume) {
        return NextResponse.json({ error: "缺少 JD 或简历内容" }, { status: 400 });
      }

      // 合并式 init：一次 LLM 调用完成 JD 分析 + 开场问题
      const { jdAnalysis, openingQuestions } = await initInterviewLLM(
        parsed.jd,
        parsed.resume
      );

      const id = newId();
      const now = new Date().toISOString();
      const record: InterviewRecord = {
        id,
        title: buildTitle(parsed.jd),
        jd: parsed.jd,
        resume: parsed.resume,
        jd_analysis: jdAnalysis,
        mode,
        messages: [],
        status: "ongoing",
        report: null,
        created_at: now,
        updated_at: now,
      };
      await saveInterview(record);

      return NextResponse.json({ interviewId: id, jdAnalysis, openingQuestions });
    }

    // ========== CHAT（流式）==========
    if (parsed.action === "chat") {
      if (!parsed.interviewId) {
        return NextResponse.json({ error: "缺少 interviewId" }, { status: 400 });
      }
      const record = await getInterview(parsed.interviewId);
      if (!record) {
        return NextResponse.json({ error: "面试不存在" }, { status: 404 });
      }

      // 合并历史：优先用客户端传来的（实时性好），但最终用服务端最新的
      const mergedHistory = mergeHistory(record.messages, parsed.conversationHistory);

      const chain = createStreamChain(record, mode, mergedHistory);
      const encoder = new TextEncoder();

      const stream = new ReadableStream({
        async start(controller) {
          try {
            const iterable = (await chain) as unknown as AsyncIterable<any>;
            if (iterable && typeof iterable[Symbol.asyncIterator] === "function") {
              for await (const chunk of iterable) {
                const content =
                  typeof chunk.content === "string"
                    ? chunk.content
                    : Array.isArray(chunk.content)
                    ? chunk.content.join("")
                    : "";
                if (content) {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ content })}\n\n`)
                  );
                }
              }
            }
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          } catch (error) {
            console.error("Stream error:", error);
            try {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ error: "生成失败" })}\n\n`
                )
              );
              controller.close();
            } catch {}
          }
        },
      });

      return new NextResponse(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // ========== END（生成报告）==========
    if (parsed.action === "end") {
      if (!parsed.interviewId) {
        return NextResponse.json({ error: "缺少 interviewId" }, { status: 400 });
      }
      const record = await getInterview(parsed.interviewId);
      if (!record) {
        return NextResponse.json({ error: "面试不存在" }, { status: 404 });
      }

      // 合并历史
      const merged = mergeHistory(record.messages, parsed.conversationHistory);

      const report = await generateInterviewReport({
        jdAnalysis: record.jd_analysis,
        resume: record.resume,
        messages: merged,
      });

      // 持久化
      record.messages = merged;
      record.status = "completed";
      record.report = report;
      record.updated_at = new Date().toISOString();
      await saveInterview(record);

      return NextResponse.json({ interviewId: record.id, report });
    }

    // ========== SAVE ==========
    if (parsed.action === "save") {
      if (!parsed.interviewId) {
        return NextResponse.json({ error: "缺少 interviewId" }, { status: 400 });
      }
      const record = await getInterview(parsed.interviewId);
      if (!record) {
        return NextResponse.json({ error: "面试不存在" }, { status: 404 });
      }
      record.messages = mergeHistory(record.messages, parsed.conversationHistory);
      record.updated_at = new Date().toISOString();
      await saveInterview(record);
      return NextResponse.json({ ok: true });
    }
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "参数错误", details: error.errors }, { status: 400 });
    }
    console.error("Interview API error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: message || "服务器内部错误" },
      { status: 500 }
    );
  }
}

// =======================================================
// GET /api/interview?action=list | &id=xxx
// =======================================================

export async function GET(req: Request) {
  const url = new URL(req.url);
  const action = url.searchParams.get("action") ?? "list";

  try {
    if (action === "list") {
      const { listInterviews } = await import("@/lib/storage");
      const list = await listInterviews();
      return NextResponse.json({ list });
    }

    if (action === "get") {
      const id = url.searchParams.get("id");
      if (!id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });
      const { getInterview } = await import("@/lib/storage");
      const record = await getInterview(id);
      if (!record) return NextResponse.json({ error: "面试不存在" }, { status: 404 });
      return NextResponse.json(record);
    }

    return NextResponse.json({ error: "未知 action" }, { status: 400 });
  } catch (err) {
    console.error("GET interview error:", err);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

// =======================================================
// 内部工具函数
// =======================================================

function buildTitle(jd: string): string {
  const trimmed = jd.trim();
  const firstLine = trimmed.split(/[\n，,]/)[0].slice(0, 20);
  return firstLine || "模拟面试";
}

function mergeHistory(
  server: { role: "user" | "assistant"; content: string }[],
  client: { role: "user" | "assistant"; content: string }[]
) {
  // 客户端总是最新的（用户在前端实时更新），以客户端为准
  if (client.length >= server.length) return client;
  return server;
}

function createStreamChain(
  record: InterviewRecord,
  mode: InterviewMode,
  history: { role: "user" | "assistant"; content: string }[]
) {
  const llm = createLLM({ streaming: true });
  const systemPrompt = buildInterviewSystemPrompt(
    mode,
    record.jd_analysis,
    record.resume
  );

  const messages = [
    new SystemMessage(systemPrompt),
    ...history.map((m) =>
      m.role === "user" ? new HumanMessage(m.content) : new AIMessage(m.content)
    ),
  ];

  return llm.stream(messages);
}

async function initInterviewLLM(
  jd: string,
  resume: string
): Promise<{ jdAnalysis: string; openingQuestions: string[] }> {
  const llm = createLLM({ streaming: false });

  const prompt = ChatPromptTemplate.fromMessages([
    SystemMessagePromptTemplate.fromTemplate(`
你同时扮演：资深 HR + 技术面试官。

请用严格 JSON 格式一次性输出两项任务结果，不要输出任何 JSON 之外的内容，不要使用 markdown 代码块包裹。

JSON 结构必须是：
{{"jdAnalysis":"Markdown 格式岗位分析（岗位名称、核心职责、硬技能、软技能、经验要求、面试考察重点）","openingQuestions":["问题1字符串","问题2字符串","问题3字符串"]}}

要求：
- jdAnalysis 简洁的 Markdown
- openingQuestions 是 3 个纯字符串数组
- Q1 轻松自我介绍，Q2 结合 JD 考察匹配度，Q3 结合简历亮点
- 只输出 JSON
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
  let jsonStr = content.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  }
  const start = jsonStr.indexOf("{");
  const end = jsonStr.lastIndexOf("}");
  if (start !== -1 && end !== -1) jsonStr = jsonStr.slice(start, end + 1);

  try {
    const parsed = JSON.parse(jsonStr);
    if (typeof parsed.jdAnalysis === "string") {
      const questions = extractQuestions(parsed.openingQuestions);
      if (questions.length > 0) return { jdAnalysis: parsed.jdAnalysis, openingQuestions: questions };
    }
  } catch {}

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
