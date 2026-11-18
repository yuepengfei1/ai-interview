import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import {
  initInterview,
  createInterviewChain,
} from "@/lib/interviewer";

// 流式面试 API
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const schema = z.object({
      action: z.enum(["init", "chat"]),
      jd: z.string().optional(),
      resume: z.string().optional(),
      jdAnalysis: z.string().optional(),
      conversationHistory: z
        .array(
          z.object({
            role: z.enum(["user", "assistant"]),
            content: z.string(),
          })
        )
        .default([]),
    });

    const parsed = schema.parse(body);

    // 初始化阶段：解析 JD + 生成开场问题
    if (parsed.action === "init") {
      if (!parsed.jd || !parsed.resume) {
        return NextResponse.json(
          { error: "缺少 JD 或简历内容" },
          { status: 400 }
        );
      }

      const { jdAnalysis, openingQuestions } = await initInterview(
        parsed.jd,
        parsed.resume
      );

      return NextResponse.json({
        jdAnalysis,
        openingQuestions,
      });
    }

    // 聊天阶段：流式生成面试追问
    if (parsed.action === "chat") {
      if (!parsed.jdAnalysis || !parsed.resume) {
        return NextResponse.json(
          { error: "缺少初始化数据，请先初始化面试" },
          { status: 400 }
        );
      }

      const encoder = new TextEncoder();
      const interviewStream = createInterviewChain(
        parsed.jdAnalysis!,
        parsed.resume!,
        parsed.conversationHistory
      );

      const stream = new ReadableStream({
        async start(controller) {
          try {
            // stream() 返回的是一个 async iterable，需要用 for await...of
            const chain = await interviewStream;
            if (chain && typeof (chain as AsyncIterable<any>)[Symbol.asyncIterator] === "function") {
              for await (const chunk of chain as AsyncIterable<any>) {
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
            console.error("Interview stream error:", error);
            try {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    error: "生成失败，请重试",
                  })}\n\n`
                )
              );
              controller.close();
            } catch {
              // controller 可能已关闭
            }
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
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "请求参数错误", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Interview API error:", error);
    return NextResponse.json(
      { error: "服务器内部错误" },
      { status: 500 }
    );
  }
}
