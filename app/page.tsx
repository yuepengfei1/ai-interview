"use client";

import { useState } from "react";
import type { CheckResponse, Risk, RiskLevel } from "@/lib/types";

const LEVEL_BADGE: Record<RiskLevel, string> = {
  高: "bg-red-50 text-red-700 ring-red-200",
  中: "bg-amber-50 text-amber-700 ring-amber-200",
  低: "bg-sky-50 text-sky-700 ring-sky-200",
};

const LEVEL_LABEL: Record<RiskLevel, string> = {
  高: "高风险",
  中: "中风险",
  低: "低风险",
};

const LEVEL_BAR: Record<RiskLevel, string> = {
  高: "bg-red-500",
  中: "bg-amber-500",
  低: "bg-sky-500",
};

const EXAMPLE = "保证年化收益8%，稳赚不赔";

function RiskCard({ risk }: { risk: Risk }) {
  return (
    <article className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <span
        className={`absolute inset-y-0 left-0 w-1 ${LEVEL_BAR[risk.level]}`}
        aria-hidden
      />
      <div className="flex items-center justify-between gap-3">
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${LEVEL_BADGE[risk.level]}`}
        >
          {LEVEL_LABEL[risk.level]}
        </span>
        <span className="truncate text-xs text-slate-500" title={risk.ruleName}>
          {risk.ruleName}
        </span>
      </div>

      <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 font-mono text-sm leading-6 text-slate-800 break-all">
        {risk.snippet}
      </p>

      {risk.reason ? (
        <p className="mt-3 text-sm leading-6 text-slate-700">{risk.reason}</p>
      ) : null}

      <dl className="mt-3 space-y-2 text-sm leading-6">
        <div>
          <dt className="text-xs font-medium text-slate-400">法规依据</dt>
          <dd className="text-slate-600">{risk.legalBasis}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-slate-400">修改建议</dt>
          <dd className="text-slate-800">{risk.suggestion}</dd>
        </div>
      </dl>
    </article>
  );
}

export default function Page() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<CheckResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCheck() {
    if (!text.trim() || loading) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = (await response.json()) as CheckResponse;

      if (!response.ok) {
        setError(data.error || "检查失败，请稍后重试");
        return;
      }
      setResult(data);
    } catch {
      setError("网络异常，请检查服务是否正常");
    } finally {
      setLoading(false);
    }
  }

  const risks = result?.risks ?? [];
  const counts = {
    高: risks.filter((risk) => risk.level === "高").length,
    中: risks.filter((risk) => risk.level === "中").length,
    低: risks.filter((risk) => risk.level === "低").length,
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            银行营销文案合规检查
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            命中监管规则后由模型给出风险定级与修改建议
          </p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs text-slate-500 ring-1 ring-inset ring-slate-200">
          规则库 3 条 · 广告法 / 理财销售办法 / 消保办法
        </span>
      </header>

      <div className="grid flex-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* 左：输入区 */}
        <section className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <label htmlFor="copy" className="text-sm font-medium text-slate-700">
            待检查文案
          </label>
          <textarea
            id="copy"
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                event.preventDefault();
                void handleCheck();
              }
            }}
            placeholder={`在此粘贴营销文案，例如：${EXAMPLE}`}
            className="mt-2 min-h-[320px] flex-1 resize-none rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm leading-6 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200"
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-xs text-slate-400">
              {text.length} 字 · Ctrl/⌘ + Enter 快速检查
            </span>
            <button
              type="button"
              onClick={handleCheck}
              disabled={loading || !text.trim()}
              className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {loading ? "检查中…" : "检查"}
            </button>
          </div>
        </section>

        {/* 右：结果区 */}
        <section className="flex min-h-[420px] flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-medium text-slate-700">风险列表</h2>
            {risks.length > 0 ? (
              <div className="flex gap-2 text-xs">
                <span className="text-red-600">高 {counts.高}</span>
                <span className="text-amber-600">中 {counts.中}</span>
                <span className="text-sky-600">低 {counts.低}</span>
              </div>
            ) : null}
          </div>

          {error ? (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          {result?.notice ? (
            <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">
              {result.notice}
            </p>
          ) : null}

          {result && result.matchedRules.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {result.matchedRules.map((rule) => (
                <span
                  key={rule.id}
                  className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600"
                  title={`命中：${rule.hits.join("、")}`}
                >
                  {rule.name}
                </span>
              ))}
            </div>
          ) : null}

          <div className="mt-4 flex-1 space-y-3 overflow-y-auto">
            {risks.map((risk) => (
              <RiskCard key={risk.id} risk={risk} />
            ))}

            {!loading && result && risks.length === 0 ? (
              <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 text-center">
                <p className="text-sm text-slate-600">未发现明显风险</p>
                <p className="max-w-xs text-xs leading-5 text-slate-400">
                  当前仅覆盖 3 条硬编码规则，仍建议人工复核风险揭示与适当性表述。
                </p>
              </div>
            ) : null}

            {!loading && !result && !error ? (
              <div className="flex h-full min-h-[200px] items-center justify-center text-center text-sm text-slate-400">
                输入文案并点击“检查”，风险卡片会展示在这里
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
