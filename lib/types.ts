export type RiskLevel = "高" | "中" | "低";

/** 单条风险，前端卡片直接渲染 */
export interface Risk {
  id: string;
  /** 原文片段（逐字摘自输入文案） */
  snippet: string;
  level: RiskLevel;
  ruleId: string;
  ruleName: string;
  /** 法规依据，来源于本地规则库，保证不会被模型改写 */
  legalBasis: string;
  /** 模型给出的命中原因 */
  reason: string;
  suggestion: string;
}

export interface MatchedRuleSummary {
  id: string;
  name: string;
  hits: string[];
}

export interface CheckResponse {
  risks: Risk[];
  matchedRules: MatchedRuleSummary[];
  /** ai = 模型结果；fallback = 本地关键词兜底 */
  source: "ai" | "fallback";
  notice?: string;
  error?: string;
}
