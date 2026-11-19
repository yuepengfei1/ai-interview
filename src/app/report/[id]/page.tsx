"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import RadarChart from "@/components/RadarChart";
import type { InterviewRecord } from "@/lib/storage";

export default function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [record, setRecord] = useState<InterviewRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/interview?action=get&id=${id}`);
        if (!res.ok) throw new Error("加载失败");
        const data = await res.json();
        setRecord(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "加载失败");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        加载报告中...
      </div>
    );
  }
  if (error || !record || !record.report) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4">
        <p className="text-red-500">{error || "报告不存在"}</p>
        <button
          onClick={() => router.push("/")}
          className="px-4 py-2 bg-indigo-500 text-white rounded-lg"
        >
          返回首页
        </button>
      </div>
    );
  }

  const { report } = record;

  const radarData = [
    { label: "逻辑表达", value: report.scores.logic },
    { label: "专业能力", value: report.scores.professional },
    { label: "简历匹配", value: report.scores.resumeMatch },
    { label: "临场反应", value: report.scores.reaction },
    { label: "情绪稳定", value: report.scores.emotion },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold">
              📊
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">面试评估报告</h1>
              <p className="text-xs text-slate-500">{record.title}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push("/history")}
              className="text-sm text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100"
            >
              历史记录
            </button>
            <button
              onClick={() => router.push("/")}
              className="text-sm text-white bg-indigo-500 hover:bg-indigo-600 px-4 py-1.5 rounded-lg"
            >
              再来一场
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* 综合分 + 雷达图 */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex flex-col md:flex-row gap-8 items-center">
            <div className="text-center md:border-r md:pr-8 md:border-slate-200">
              <p className="text-sm text-slate-500">综合得分</p>
              <p
                className={`text-6xl font-bold my-2 ${
                  report.scores.overall >= 7
                    ? "text-emerald-500"
                    : report.scores.overall >= 5
                    ? "text-amber-500"
                    : "text-red-500"
                }`}
              >
                {report.scores.overall.toFixed(1)}
              </p>
              <p className="text-xs text-slate-400">满分 10</p>
            </div>
            <div className="flex-1 w-full">
              <RadarChart data={radarData} size={300} />
            </div>
          </div>
          <p className="mt-6 text-sm text-slate-700 leading-relaxed border-l-4 border-indigo-400 pl-4">
            {report.summary}
          </p>
        </section>

        {/* 改进建议 */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">
            💡 改进建议
          </h2>
          <ul className="space-y-2">
            {report.suggestions.map((s, i) => (
              <li key={i} className="flex gap-3 text-sm text-slate-700">
                <span className="text-indigo-500 font-bold">{i + 1}.</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* 逐题复盘 */}
        {report.breakdown.length > 0 && (
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">
              📝 逐题复盘
            </h2>
            <div className="space-y-4">
              {report.breakdown.map((b, i) => (
                <div
                  key={i}
                  className="border border-slate-200 rounded-xl p-4 bg-slate-50"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="text-sm font-semibold text-slate-800 min-w-0">
                      Q{i + 1}. {b.question}
                    </h3>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap shrink-0 ${
                        b.score >= 7
                          ? "bg-emerald-100 text-emerald-700"
                          : b.score >= 5
                          ? "bg-amber-100 text-amber-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {b.score} / 10
                    </span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-slate-500 text-xs">你的回答：</span>
                      <p className="text-slate-700 mt-1 pl-3 border-l-2 border-slate-300">
                        {b.answer}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-xs">AI 点评：</span>
                      <p className="text-slate-700 mt-1 pl-3 border-l-2 border-indigo-300">
                        {b.feedback}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-xs">满分参考：</span>
                      <p className="text-slate-700 mt-1 pl-3 border-l-2 border-emerald-300">
                        {b.idealAnswer}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
