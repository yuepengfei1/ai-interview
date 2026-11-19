"use client";

import { useState } from "react";
import { SCENARIO_LABELS, PRESSURE_LABELS } from "@/lib/modes";
import type { InterviewMode } from "@/lib/storage";

interface InterviewFormProps {
  onComplete: (
    interviewId: string,
    jdAnalysis: string,
    openingQuestions: string[],
    jd: string,
    resume: string,
    mode: InterviewMode
  ) => void;
}

const DEFAULT_MODE: InterviewMode = { scenario: "general", pressure: "standard" };

export default function InterviewForm({ onComplete }: InterviewFormProps) {
  const [jd, setJd] = useState("");
  const [resume, setResume] = useState("");
  const [mode, setMode] = useState<InterviewMode>(DEFAULT_MODE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!jd.trim() || !resume.trim()) {
      setError("请填写岗位 JD 和个人简历");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "init", jd, resume, mode }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "初始化失败");
      }
      const data = await res.json();
      onComplete(data.interviewId, data.jdAnalysis, data.openingQuestions, jd, resume, mode);
    } catch (err) {
      setError(err instanceof Error ? err.message : "未知错误");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-5">
          <h2 className="text-white text-lg font-semibold">开始模拟面试</h2>
          <p className="text-indigo-100 text-sm mt-1">
            填写岗位 JD 和简历，选择面试模式，AI 为你打造专属面试
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* 场景选择 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              面试场景
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(Object.keys(SCENARIO_LABELS) as InterviewMode["scenario"][]).map(
                (key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setMode({ ...mode, scenario: key })}
                    className={`px-3 py-2 rounded-xl text-sm font-medium transition-all border ${
                      mode.scenario === key
                        ? "bg-indigo-500 text-white border-indigo-500"
                        : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"
                    }`}
                  >
                    {SCENARIO_LABELS[key]}
                  </button>
                )
              )}
            </div>
          </div>

          {/* 压力等级 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              难度 / 压力等级
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(PRESSURE_LABELS) as InterviewMode["pressure"][]).map(
                (key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setMode({ ...mode, pressure: key })}
                    className={`px-3 py-2 rounded-xl text-sm font-medium transition-all border ${
                      mode.pressure === key
                        ? "bg-purple-500 text-white border-purple-500"
                        : "bg-white text-slate-600 border-slate-200 hover:border-purple-300"
                    }`}
                  >
                    {PRESSURE_LABELS[key]}
                  </button>
                )
              )}
            </div>
          </div>

          {/* JD / 简历 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              岗位 JD（职位描述）
            </label>
            <textarea
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              placeholder="粘贴或输入岗位 JD..."
              rows={5}
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
              placeholder="粘贴或输入你的简历摘要..."
              rows={5}
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
            className="w-full py-3 px-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-xl hover:from-indigo-600 hover:to-purple-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
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
        <FeatureCard icon="🎯" title="智能匹配" desc="AI 深度分析 JD 与简历" />
        <FeatureCard icon="💬" title="流式追问" desc="像真实面试一样的追问" />
        <FeatureCard icon="📊" title="复盘报告" desc="结束后生成多维评估" />
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="bg-white rounded-xl p-4 border border-slate-200 text-center">
      <div className="text-2xl mb-2">{icon}</div>
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      <p className="text-xs text-slate-500 mt-1">{desc}</p>
    </div>
  );
}
