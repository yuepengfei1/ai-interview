import { NextResponse } from "next/server";
import OpenAI from "openai";
import { matchRules, type RuleMatch } from "@/lib/rules";
import type {
  CheckResponse,
  MatchedRuleSummary,
  Risk,
  RiskLevel,
} from "@/lib/types";

export const runtime = "nodejs";

const LEVELS: RiskLevel[] = ["高", "中", "低"];

function summarize(matches: RuleMatch[]): MatchedRuleSummary[] {
  return matches.map(({ rule, hits }) => ({
    id: rule.id,
    name: rule.name,
    hits,
  }));
}

/** 截取关键词附近的原文，作为兜底结果的片段 */
function snippetAround(text: string, keyword: string, radius = 14): string {
  const index = text.indexOf(keyword);
  if (index === -1) return "";
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + keyword.length + radius);
  return `${start > 0 ? "…" : ""}${text.slice(start, end)}${end < text.length ? "…" : ""}`;
}

/** 未配置模型 / 模型失败时的本地兜底结果 */
function buildFallbackRisks(text: string, matches: RuleMatch[]): Risk[] {
  return matches.map(({ rule, hits }, index) => ({
    id: `fallback-${index}`,
    snippet: snippetAround(text, hits[0]) || text.slice(0, 40),
    level: rule.level,
    ruleId: rule.id,
    ruleName: rule.name,
    legalBasis: rule.legalBasis,
    reason: `命中关键词：${hits.join("、")}，涉嫌违反该条监管要求。`,
    suggestion: rule.suggestion,
  }));
}

function buildPrompt(text: string, matches: RuleMatch[]) {
  const ruleBlock = matches
    .map(
      ({ rule, hits }) => `- ruleId: ${rule.id}
  规则：${rule.name}
  违规要点：${rule.description}
  命中关键词：${hits.join("、")}
  法规依据：${rule.legalBasis}
  参考修改建议：${rule.suggestion}`,
    )
    .join("\n");

  const system = `你是银行与理财业务的营销文案合规审查专家，只依据给定的监管规则判断，不引入其他规则。
严格要求：
1. 只输出 JSON 对象，不要输出 Markdown、解释或多余文字。
2. 输出结构：{"risks":[{"snippet":"原文逐字片段","level":"高|中|低","ruleId":"规则ID","reason":"违规原因","suggestion":"修改建议"}]}
3. snippet 必须从用户文案中逐字复制，长度不超过 40 字，不得改写、不得拼接。
4. ruleId 只能取给定规则列表中的值。
5. 每一处实际违规都要单独成条，不同片段对应不同条目；文案没有问题的规则不要输出。
6. 若确实没有风险，输出 {"risks":[]}。`;

  const user = `【可用监管规则】
${ruleBlock}

【待检查文案】
${text}`;

  return { system, user };
}

/** 校验并归一化模型输出：丢弃伪造片段与越权规则 */
function normalizeRisks(
  raw: unknown,
  text: string,
  matches: RuleMatch[],
): Risk[] {
  const list = Array.isArray((raw as { risks?: unknown })?.risks)
    ? ((raw as { risks: unknown[] }).risks)
    : [];
  const allowed = new Map(matches.map(({ rule }) => [rule.id, rule]));
  const seen = new Set<string>();
  const risks: Risk[] = [];

  for (const item of list) {
    const value = item as Record<string, unknown>;
    const rule = allowed.get(String(value?.ruleId ?? ""));
    if (!rule) continue;

    const snippet = String(value?.snippet ?? "").trim();
    if (!snippet || !text.includes(snippet)) continue;

    const key = `${rule.id}::${snippet}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const level = LEVELS.includes(value?.level as RiskLevel)
      ? (value.level as RiskLevel)
      : rule.level;

    risks.push({
      id: `${rule.id}-${risks.length}`,
      snippet,
      level,
      ruleId: rule.id,
      ruleName: rule.name,
      legalBasis: rule.legalBasis,
      reason: String(value?.reason ?? "").trim(),
      suggestion: String(value?.suggestion ?? "").trim() || rule.suggestion,
    });
  }

  return risks.slice(0, 12);
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体必须是 JSON" }, { status: 400 });
  }

  const rawText = (payload as { text?: unknown })?.text;
  const text = typeof rawText === "string" ? rawText.trim() : "";

  if (!text) {
    return NextResponse.json({ error: "请先输入要检查的文案" }, { status: 400 });
  }
  if (text.length > 20000) {
    return NextResponse.json(
      { error: "文案过长，请控制在 20000 字以内" },
      { status: 400 },
    );
  }

  // 1. 本地关键词召回
  const matches = matchRules(text);
  const matchedRules = summarize(matches);

  if (matches.length === 0) {
    return NextResponse.json({
      risks: [],
      matchedRules,
      source: "fallback",
      notice: "本地关键词未命中任何监管规则，未调用模型。",
    } satisfies CheckResponse);
  }

  const fallback = (notice: string) =>
    ({
      risks: buildFallbackRisks(text, matches),
      matchedRules,
      source: "fallback",
      notice,
    }) satisfies CheckResponse;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(fallback("未配置 OPENAI_API_KEY，已返回本地规则命中结果。"));
  }

  // 2. 仅把命中的规则送进 prompt
  const { system, user } = buildPrompt(text, matches);

  try {
    const client = new OpenAI({
      apiKey,
      baseURL: process.env.OPENAI_BASE_URL || undefined,
      timeout: 30_000,
      maxRetries: 0,
    });

    const completion = await client.chat.completions.create({
      model: process.env.MODEL_NAME || "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });

    const content = completion.choices[0]?.message?.content ?? "";
    const risks = normalizeRisks(JSON.parse(content), text, matches);

    if (risks.length === 0) {
      return NextResponse.json(
        fallback("模型未返回可用的风险条目，已返回本地规则命中结果。"),
      );
    }

    return NextResponse.json({
      risks,
      matchedRules,
      source: "ai",
    } satisfies CheckResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json(
      fallback(`模型调用失败（${message}），已返回本地规则命中结果。`),
    );
  }
}
