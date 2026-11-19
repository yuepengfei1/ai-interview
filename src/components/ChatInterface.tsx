"use client";

import { useEffect, useRef, useState } from "react";
import type { ConversationMessage, InterviewMode } from "@/types";
import VoiceRecorder from "./VoiceRecorder";

interface ChatInterfaceProps {
  interviewId: string;
  jdAnalysis: string;
  resume: string;
  mode: InterviewMode;
  openingQuestions: string[];
  conversationHistory: ConversationMessage[];
  onConversationUpdate: (history: ConversationMessage[]) => void;
  onInterviewEnd: (reportId: string) => void;
}

export default function ChatInterface({
  interviewId,
  jdAnalysis,
  resume,
  mode,
  openingQuestions,
  conversationHistory,
  onConversationUpdate,
  onInterviewEnd,
}: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [error, setError] = useState("");
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [ending, setEnding] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const messages = [
    ...conversationHistory,
    ...(streamingContent
      ? [{ role: "assistant" as const, content: streamingContent }]
      : []),
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 每次 assistant 消息更新时，如果开启了 TTS 就朗读
  useEffect(() => {
    if (!ttsEnabled || !streamingContent) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    // 只在流式最后有完整内容时朗读一次：用 [DONE] 事件后触发
  }, [ttsEnabled, streamingContent]);

  const speak = (text: string) => {
    if (!ttsEnabled) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "zh-CN";
    utter.rate = 1;
    utter.pitch = 1;
    // 尝试选中文语音
    const voices = window.speechSynthesis.getVoices();
    const zh = voices.find(
      (v) => v.lang.startsWith("zh") || v.lang.startsWith("cmn")
    );
    if (zh) utter.voice = zh;
    window.speechSynthesis.speak(utter);
  };

  const startInterview = (question: string) => {
    onConversationUpdate([
      ...conversationHistory,
      { role: "assistant", content: question },
    ]);
    speak(question);
  };

  const handleStop = () => {
    abortRef.current?.abort();
    setIsStreaming(false);
    if (streamingContent) {
      onConversationUpdate([
        ...conversationHistory,
        { role: "assistant", content: streamingContent },
      ]);
      setStreamingContent("");
    }
  };

  const handleEnd = async () => {
    if (!confirm("确认结束这场面试并生成评估报告？")) return;
    setEnding(true);
    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "end",
          interviewId,
          conversationHistory,
        }),
      });
      if (!res.ok) throw new Error("生成报告失败");
      const data = await res.json();
      onInterviewEnd(data.interviewId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "结束失败");
      setEnding(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    setError("");

    const userMessage: ConversationMessage = { role: "user", content: input.trim() };
    const newHistory = [...conversationHistory, userMessage];
    onConversationUpdate(newHistory);
    setInput("");
    setIsStreaming(true);
    setStreamingContent("");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "chat",
          interviewId,
          mode,
          conversationHistory: newHistory,
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) throw new Error("请求失败");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";
      let doneContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") {
              if (accumulated) {
                onConversationUpdate([
                  ...newHistory,
                  { role: "assistant", content: accumulated },
                ]);
                doneContent = accumulated;
              }
              setStreamingContent("");
              setIsStreaming(false);
              break;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.error) {
                setError(parsed.error);
                setIsStreaming(false);
                return;
              }
              if (parsed.content) {
                accumulated += parsed.content;
                setStreamingContent(accumulated);
              }
            } catch {}
          }
        }
        if (!isStreaming && doneContent) break;
      }

      // 兜底
      if (accumulated && !doneContent) {
        onConversationUpdate([
          ...newHistory,
          { role: "assistant", content: accumulated },
        ]);
        speak(accumulated);
      } else if (doneContent) {
        speak(doneContent);
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      console.error("Chat error:", err);
      setError(err instanceof Error ? err.message : "请求失败");
      setIsStreaming(false);
      setStreamingContent("");
    }
  };

  const hasStarted = conversationHistory.length > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* 侧边栏 */}
      <aside className="lg:col-span-1 space-y-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">📋 JD 分析</h3>
            <button
              onClick={() => setTtsEnabled((v) => !v)}
              className={`text-xs px-2 py-1 rounded ${
                ttsEnabled ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-600"
              }`}
              title="AI 回答语音播报"
            >
              {ttsEnabled ? "🔊 TTS" : "🔇 TTS"}
            </button>
          </div>
          <div className="p-4 max-h-64 overflow-y-auto">
            <pre className="text-xs text-slate-600 whitespace-pre-wrap font-sans leading-relaxed">
              {jdAnalysis}
            </pre>
          </div>
        </div>
        {hasStarted && (
          <button
            onClick={handleEnd}
            disabled={ending}
            className="w-full py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-medium rounded-xl hover:from-emerald-600 hover:to-teal-700 disabled:opacity-60 transition-all"
          >
            {ending ? "生成报告中..." : "🏁 结束面试 & 生成报告"}
          </button>
        )}
      </aside>

      {/* 主对话区 */}
      <div className="lg:col-span-3 flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 h-[calc(100vh-200px)] max-h-[800px]">
        {!hasStarted && (
          <div className="p-6 border-b border-slate-200">
            <h3 className="text-sm font-medium text-slate-700 mb-3">
              AI 为你准备了以下开场问题，选择一个开始面试：
            </h3>
            <div className="space-y-2">
              {openingQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => startInterview(q)}
                  className="w-full text-left px-4 py-3 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl text-sm text-slate-700 hover:text-indigo-700 transition-all"
                >
                  <span className="text-indigo-500 font-medium mr-2">Q{i + 1}.</span>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg, i) => (
            <MessageBubble key={i} message={msg} />
          ))}
          <div ref={messagesEndRef} />
        </div>

        {hasStarted && (
          <div className="border-t border-slate-200 p-4">
            {error && (
              <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="flex gap-2 items-end">
              <VoiceRecorder
                onText={(t) => setInput((prev) => (prev ? prev + " " + t : t))}
                disabled={isStreaming}
              />
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  isStreaming
                    ? "AI 正在回答..."
                    : "输入你的回答...（或用麦克风说话 🎤）"
                }
                rows={2}
                disabled={isStreaming}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm resize-none disabled:bg-slate-50 disabled:cursor-not-allowed"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
              />
              {isStreaming ? (
                <button
                  type="button"
                  onClick={handleStop}
                  className="px-4 py-2 bg-red-500 text-white font-medium rounded-xl hover:bg-red-600 transition-colors"
                >
                  ⏹ 停止
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-xl hover:from-indigo-600 hover:to-purple-700 disabled:opacity-60 transition-all"
                >
                  发送
                </button>
              )}
            </form>
            <p className="text-xs text-slate-400 mt-2 text-center">
              Enter 发送 · Shift+Enter 换行 · 点麦克风说话
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ConversationMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 ${
          isUser
            ? "bg-gradient-to-br from-slate-600 to-slate-800"
            : "bg-gradient-to-br from-indigo-500 to-purple-600"
        }`}
      >
        {isUser ? "你" : "AI"}
      </div>
      <div
        className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-br-md"
            : "bg-slate-100 text-slate-800 rounded-bl-md"
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}
