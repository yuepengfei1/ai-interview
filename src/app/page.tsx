"use client";

import { useState } from "react";
import InterviewForm from "@/components/InterviewForm";
import ChatInterface from "@/components/ChatInterface";
import { InterviewState } from "@/types";

export default function Home() {
  const [state, setState] = useState<InterviewState>({
    step: "setup",
    jd: "",
    resume: "",
    jdAnalysis: "",
    openingQuestions: [],
    conversationHistory: [],
  });

  const handleInitComplete = (
    jdAnalysis: string,
    openingQuestions: string[],
    jd: string,
    resume: string
  ) => {
    // 后端兜底：强制把每个问题转成字符串，防御 LLM 偶发返回对象
    const safeQuestions = openingQuestions
      .map((q: any) => {
        if (typeof q === "string") return q;
        if (q && typeof q === "object") {
          return (
            q.question ||
            q.text ||
            q.content ||
            q.title ||
            JSON.stringify(q)
          );
        }
        return String(q ?? "");
      })
      .filter((s: string) => s && s.trim())
      .slice(0, 3);

    setState((prev) => ({
      ...prev,
      step: "chat",
      jd,
      resume,
      jdAnalysis,
      openingQuestions: safeQuestions,
    }));
  };

  const handleReset = () => {
    setState({
      step: "setup",
      jd: "",
      resume: "",
      jdAnalysis: "",
      openingQuestions: [],
      conversationHistory: [],
    });
  };

  const handleConversationUpdate = (
    conversationHistory: InterviewState["conversationHistory"]
  ) => {
    setState((prev) => ({ ...prev, conversationHistory }));
  };

  return (
    <main className="min-h-screen">
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <span className="text-white text-xl font-bold">AI</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">
                智能模拟面试官
              </h1>
              <p className="text-xs text-slate-500">
                AI Mock Interviewer · Powered by LangChain
              </p>
            </div>
          </div>
          {state.step === "chat" && (
            <button
              onClick={handleReset}
              className="text-sm text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              重新开始
            </button>
          )}
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {state.step === "setup" ? (
          <InterviewForm onComplete={handleInitComplete} />
        ) : (
          <ChatInterface
            jdAnalysis={state.jdAnalysis}
            resume={state.resume}
            openingQuestions={state.openingQuestions}
            conversationHistory={state.conversationHistory}
            onConversationUpdate={handleConversationUpdate}
          />
        )}
      </div>
    </main>
  );
}
