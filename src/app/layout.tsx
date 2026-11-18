import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 智能模拟面试官",
  description: "基于 AI 的智能模拟面试系统，帮助你提升面试技能",
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
