import { createServerClient } from "@/lib/supabase/server";

export interface InterviewRecord {
  id: string;
  user_id?: string;
  title: string;
  jd: string;
  resume: string;
  jd_analysis: string;
  mode: InterviewMode;
  messages: { role: "user" | "assistant"; content: string }[];
  status: "ongoing" | "completed";
  report?: InterviewReport | null;
  created_at: string;
  updated_at: string;
}

export interface InterviewMode {
  scenario: "tech" | "behavioral" | "coding" | "general";
  pressure: "gentle" | "standard" | "stress";
}

export interface InterviewReport {
  scores: {
    logic: number;
    professional: number;
    resumeMatch: number;
    reaction: number;
    emotion: number;
    overall: number;
  };
  breakdown: {
    question: string;
    answer: string;
    feedback: string;
    idealAnswer: string;
    score: number;
  }[];
  suggestions: string[];
  summary: string;
}

// ==================== Supabase 方案 ====================

// 懒加载：避免模块初始化阶段读取环境变量（构建期可能不存在）
let serverSupabase: ReturnType<typeof createServerClient> | undefined;

function getServerSupabase() {
  if (serverSupabase === undefined) {
    serverSupabase = createServerClient();
  }
  return serverSupabase;
}

// ==================== 无 Supabase 时的降级方案 ====================
// 服务端（API 路由）使用进程内存存储；浏览器端使用 localStorage。
// 注意：内存存储仅适用于本地开发 / 单实例部署，重启后会清空。

const LS_KEY = "ai_interviews_v1";

const memoryStore = new Map<string, InterviewRecord>();

function isBrowser() {
  return typeof window !== "undefined";
}

function fallbackList(): InterviewRecord[] {
  if (isBrowser()) {
    try {
      const raw = window.localStorage.getItem(LS_KEY);
      return raw ? (JSON.parse(raw) as InterviewRecord[]) : [];
    } catch {
      return [];
    }
  }
  return Array.from(memoryStore.values());
}

function fallbackSave(list: InterviewRecord[]) {
  if (isBrowser()) {
    try {
      window.localStorage.setItem(LS_KEY, JSON.stringify(list));
    } catch {
      // 忽略存储异常
    }
    return;
  }
  memoryStore.clear();
  for (const item of list) memoryStore.set(item.id, item);
}


// ==================== 公共 API ====================

export async function listInterviews(userId?: string): Promise<InterviewRecord[]> {
  const sb = getServerSupabase();
  if (sb) {
    let q = sb
      .from("interviews")
      .select("*")
      .order("updated_at", { ascending: false });
    if (userId) q = q.eq("user_id", userId);
    const { data } = await q;
    return (data ?? []) as unknown as InterviewRecord[];
  }
  // 降级存储
  return fallbackList()
    .filter((r) => !userId || r.user_id === userId)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export async function getInterview(id: string): Promise<InterviewRecord | null> {
  const sb = getServerSupabase();
  if (sb) {
    const { data } = await sb.from("interviews").select("*").eq("id", id).maybeSingle();
    return (data as unknown as InterviewRecord) ?? null;
  }
  return fallbackList().find((r) => r.id === id) ?? null;
}

export async function saveInterview(
  record: InterviewRecord
): Promise<InterviewRecord> {
  const sb = getServerSupabase();
  if (sb) {
    const { data } = await sb
      .from("interviews")
      .upsert(record)
      .select()
      .single();
    return data as unknown as InterviewRecord;
  }
  const list = fallbackList();
  const idx = list.findIndex((r) => r.id === record.id);
  if (idx >= 0) list[idx] = record;
  else list.unshift(record);
  fallbackSave(list);
  return record;
}

export async function deleteInterview(id: string): Promise<void> {
  const sb = getServerSupabase();
  if (sb) {
    await sb.from("interviews").delete().eq("id", id);
    return;
  }
  const list = fallbackList().filter((r) => r.id !== id);
  fallbackSave(list);
}

export function newId() {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  );
}
