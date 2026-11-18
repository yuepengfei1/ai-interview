"use client";

import { useState } from "react";

interface InterviewFormProps {
  onComplete: (
    jdAnalysis: string,
    openingQuestions: string[],
    jd: string,
    resume: string
  ) => void;
}

export default function InterviewForm({ onComplete }: InterviewFormProps) {
  const [jd, setJd] = useState("");
  const [resume, setResume] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!jd.trim()) {
      setError("请填写岗位 JD");
      return;
    }
    if (!resume.trim()) {
      setError("请填写你的简历");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "init",
          jd,
          resume,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "初始化失败");
      }

      const data = await res.json();
      onComplete(data.jdAnalysis, data.openingQuestions, jd, resume);
    } catch (err) {
      setError(err instanceof Error ? err.message : "发生未知错误");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-5">
          <h2 className="text-white text-lg font-semibold">
            开始模拟面试
          </h2>
          <p className="text-indigo-100 text-sm mt-1">
            填写岗位 JD 和你的简历，AI 将为你生成一场针对性的面试
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              岗位 JD（职位描述）
            </label>
            <textarea
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              placeholder="粘贴或输入岗位 JD，例如：&#10;负责公司核心业务系统的后端开发，要求 3 年以上 Node.js 经验..."
              rows={8}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              个人简历
            </label>
            <textarea
              value={resume}
              onChange={(e) => setResume(e.target.value)}
              placeholder="粘贴或输入你的简历摘要，例如：&#10;张三，3 年后端开发经验，熟悉 Node.js/React，有大型项目经验..."
              rows={8}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm resize-none"
            />
          </div>

          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-xl hover:from-indigo-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin h-5 w-5"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                正在分析 JD 和简历...
              </span>
            ) : (
              "开始面试"
            )}
          </button>
        </form>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <FeatureCard
          icon="🎯"
          title="智能匹配"
          desc="AI 深度分析 JD 与简历，精准定位考察重点"
        />
        <FeatureCard
          icon="💬"
          title="流式追问"
          desc="像真实面试一样的追问，支持随时中断"
        />
        <FeatureCard
          icon="📊"
          title="结构化输出"
          desc="面试过程结构化，支持后续 RAG 增强"
        />
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="bg-white rounded-xl p-4 border border-slate-200 text-center">
      <div className="text-2xl mb-2">{icon}</div>
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      <p className="text-xs text-slate-500 mt-1">{desc}</p>
    </div>
  );
}
