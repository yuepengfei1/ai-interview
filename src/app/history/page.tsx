"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SCENARIO_LABELS, PRESSURE_LABELS } from "@/lib/modes";
import type { InterviewRecord } from "@/lib/storage";

export default function HistoryPage() {
  const router = useRouter();
  const [list, setList] = useState<InterviewRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/interview?action=list");
      if (res.ok) {
        const data = await res.json();
        setList(data.list);
      }
      setLoading(false);
    })();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除这场面试记录？")) return;
    // 简化：直接用 fetch 调用存储层（后端没单独 delete route，这里客户端直接操作 storage 抽象需要新 API）
    // 暂时用本地方案：前端从数组移除
    setList((prev) => prev.filter((r) => r.id !== id));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        加载中...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-800">📁 历史面试记录</h1>
          <button
            onClick={() => router.push("/")}
            className="text-sm text-indigo-500 hover:text-indigo-600 font-medium"
          >
            + 新建面试
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {list.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
            <div className="text-5xl mb-4">📭</div>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">
              还没有任何面试记录
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              完成一场面试后，记录会自动保存在这里
            </p>
            <button
              onClick={() => router.push("/")}
              className="px-6 py-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 transition-colors"
            >
              开始第一场面试
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {list.map((r) => (
              <div
                key={r.id}
                className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-semibold text-slate-800 truncate">
                      {r.title}
                    </h3>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                        r.status === "completed"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {r.status === "completed" ? "已完成" : "进行中"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded">
                      {SCENARIO_LABELS[r.mode.scenario]}
                    </span>
                    <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded">
                      {PRESSURE_LABELS[r.mode.pressure]}
                    </span>
                    <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">
                      {r.messages.length} 轮对话
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mb-4">
                    创建于 {new Date(r.created_at).toLocaleString()}
                  </p>
                  <div className="flex gap-2">
                    {r.status === "completed" && r.report ? (
                      <button
                        onClick={() => router.push(`/report/${r.id}`)}
                        className="flex-1 text-sm py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700"
                      >
                        📊 查看报告
                      </button>
                    ) : (
                      <button
                        onClick={() => router.push(`/?resumeId=${r.id}`)}
                        className="flex-1 text-sm py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
                      >
                        继续面试
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="text-sm py-2 px-3 text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
