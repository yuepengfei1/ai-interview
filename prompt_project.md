# 项目名称：AI 智能模拟面试官（Next.js 16 + LangChain.js）

## 1. 项目目标
基于 Next.js 16 App Router 和 LangChain.js，构建一个可公开访问的 AI 模拟面试系统。

用户输入岗位 JD 和个人简历后，系统能够：
- 解析 JD 并提取关键能力要求；
- 结合候选人背景生成面试追问；
- 以流式方式输出 AI 面试官回答；
- 支持用户中断生成；
- 后续可接入面经 RAG，提升追问质量。

## 2. 技术栈
- Next.js 16（App Router）
- TypeScript
- Tailwind CSS
- LangChain.js
- Zod
- OpenAI 兼容接口（可替换为智谱 GLM、DeepSeek、通义千问等）
- Supabase / PostgreSQL + pgvector（RAG 阶段使用）

## 3. 环境变量
在项目根目录创建 `.env.local`，包含：

```env
OPENAI_API_KEY=
OPENAI_BASE_URL=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=