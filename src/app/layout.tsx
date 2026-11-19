import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 智能模拟面试官",
  description: "AI Mock Interviewer · JD 解析 · 流式追问 · 复盘报告",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
