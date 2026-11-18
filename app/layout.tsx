import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "银行营销文案合规检查工具",
  description: "基于监管规则的营销文案风险检查",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (  
    <html lang="zh-CN">
      <body className="font-sans">{children}</body>
    </html>
  );
}
