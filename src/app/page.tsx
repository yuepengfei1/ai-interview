"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import InterviewForm from "@/components/InterviewForm";
import ChatInterface from "@/components/ChatInterface";
import type { InterviewMode, InterviewState } from "@/types";

const DEFAULT_MODE: InterviewMode = { scenario: "general", pressure: "standard" };

export default function Home() {
  const router = useRouter();
  const [state, setState] = useState<InterviewState>({
    step: "setup",
    interviewId: "",
    jd: "",
    resume: "",
    jdAnalysis: "",
    mode: DEFAULT_MODE,
    openingQuestions: [],
    conversationHistory: [],
  });

  const handleInitComplete = (
    interviewId: string,
    jdAnalysis: string,
    openingQuestions: string[],
    jd: string,
    resume: string,
    mode: InterviewMode
  ) => {
    // 防御：确保 openingQuestions 是字符串数组
    const safeQuestions = openingQuestions
      .map((q: any) => {
        if (typeof q === "string") return q;
        if (q && typeof q === "object") {
          return q.question || q.text || q.content || JSON.stringify(q);
        }
        return String(q ?? "");
      })
      .filter((s) => s && s.trim())
      .slice(0, 3);

    setState((prev) => ({
      ...prev,
      step: "chat",
      interviewId,
      jd,
      resume,
      jdAnalysis,
      mode,
      openingQuestions: safeQuestions,
    }));
  };

  const handleConversationUpdate = (history: InterviewState["conversationHistory"]) => {
    setState((prev) => ({ ...prev, conversationHistory: history }));
  };

  const handleReset = () => {
    setState({
      step: "setup",
      interviewId: "",
      jd: "",
      resume: "",
      jdAnalysis: "",
      mode: DEFAULT_MODE,
      openingQuestions: [],
      conversationHistory: [],
    });
  };

  const handleInterviewEnd = (reportInterviewId: string) => {
    // 跳转到报告页
    router.push(`/report/${reportInterviewId}`);
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
                AI Mock Interviewer · LangChain + Supabase
              </p>
            </div>
          </div>
          <nav className="flex items-center gap-2">
            <button
              onClick={() => router.push("/history")}
              className="text-sm text-slate-600 hover:text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              📁 历史记录
            </button>
            {state.step === "chat" && (
              <button
                onClick={handleReset}
                className="text-sm text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                重新开始
              </button>
            )}
          </nav>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {state.step === "setup" ? (
          <InterviewForm onComplete={handleInitComplete} />
        ) : (
          <ChatInterface
            interviewId={state.interviewId}
            jdAnalysis={state.jdAnalysis}
            resume={state.resume}
            mode={state.mode}
            openingQuestions={state.openingQuestions}
            conversationHistory={state.conversationHistory}
            onConversationUpdate={handleConversationUpdate}
            onInterviewEnd={handleInterviewEnd}
          />
        )}
      </div>
    </main>
  );
}
