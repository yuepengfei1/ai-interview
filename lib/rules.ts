import type { RiskLevel } from "./types";

export interface Rule {
  id: string;
  name: string;
  /** 法规依据原文，作为卡片展示与 prompt 上下文的唯一来源 */
  legalBasis: string;
  /** 默认风险等级 */
  level: RiskLevel;
  /** 违规要点，用于 prompt 描述 */
  description: string;
  /** 本地召回关键词 */
  keywords: string[];
  /** 兜底建议 */
  suggestion: string;
}

export const RULES: Rule[] = [
  {
    id: "AD-LAW-25",
    name: "广告法第二十五条（金融理财广告）",
    legalBasis:
      "《中华人民共和国广告法》第二十五条：招商等有投资回报预期的商品或者服务广告，应当对可能存在的风险以及风险责任承担有合理提示或者警示，不得对未来效果、收益或者与其相关的情况作出保证性承诺，明示或者暗示保本、无风险或者保收益等。",
    level: "高",
    description:
      "对未来收益、效果作保证性承诺；明示或暗示保本、保收益、无风险、稳赚不赔。",
    keywords: [
      "保本",
      "保收益",
      "保证收益",
      "保证回报",
      "保证年化",
      "稳赚不赔",
      "稳赚不亏",
      "稳赚",
      "只赚不赔",
      "零风险",
      "无风险",
      "绝对安全",
      "必赚",
    ],
    suggestion:
      "删除“保本/保收益/稳赚不赔”等承诺性表述，改为风险提示，如“本产品不保证本金及收益，存在本金损失风险，历史业绩不代表未来表现”。",
  },
  {
    id: "WM-SALES-23",
    name: "理财公司理财产品销售管理暂行办法第二十三条",
    legalBasis:
      "《理财公司理财产品销售管理暂行办法》第二十三条：理财产品销售机构及其销售人员在销售过程中，不得夸大或者片面宣传理财产品，不得违规使用“安全”“保证”“承诺”“高收益”“无风险”等与产品风险收益特性不匹配的表述，不得宣传理财产品预期收益率。",
    level: "中",
    description:
      "夸大或片面宣传收益、违规使用“保证/高收益/无风险”类表述、直接宣传预期收益率或年化收益。",
    keywords: [
      "年化收益",
      "预期收益",
      "预期年化",
      "收益率",
      "业绩比较基准",
      "高收益",
      "翻倍",
      "保底",
      "稳定增值",
      "跑赢通胀",
    ],
    suggestion:
      "删除或弱化收益率宣传，仅可在充分揭示风险的前提下客观展示业绩比较基准，并注明“业绩比较基准不代表实际收益，产品存在净值波动风险”。",
  },
  {
    id: "CONSUMER-PROTECT-21",
    name: "银行保险机构消费者权益保护管理办法第二十一条、第二十二条",
    legalBasis:
      "《银行保险机构消费者权益保护管理办法》第二十一条、第二十二条：银行保险机构不得进行虚假、片面宣传，不得夸大产品收益或者隐瞒产品风险，不得以误导性表述使消费者作出错误判断，应当以显著方式充分揭示风险。",
    level: "中",
    description:
      "虚假、片面或误导性宣传，隐瞒风险，诱导消费者作出错误判断（如闭眼买、躺赚、不会亏）。",
    keywords: [
      "稳赚不赔",
      "稳赚",
      "闭眼买",
      "闭着眼睛买",
      "躺赚",
      "包赚",
      "不会亏",
      "零风险",
      "无风险",
      "高收益",
      "绝对安全",
    ],
    suggestion:
      "补充风险揭示与适当性提示，避免绝对化、误导性话术，如“投资有风险，请根据自身风险承受能力谨慎决策”。",
  },
];

export interface RuleMatch {
  rule: Rule;
  /** 命中的关键词（去重，按出现顺序） */
  hits: string[];
}

/** 本地关键词召回：命中任意关键词即视为相关规则 */
export function matchRules(text: string): RuleMatch[] {
  const matches: RuleMatch[] = [];

  for (const rule of RULES) {
    const hits = rule.keywords.filter((keyword) => text.includes(keyword));
    if (hits.length > 0) {
      matches.push({ rule, hits });
    }
  }

  return matches.sort((a, b) => b.hits.length - a.hits.length);
}

export const RULE_MAP = new Map(RULES.map((rule) => [rule.id, rule]));
