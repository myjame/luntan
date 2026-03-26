import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "论坛 | 公开兴趣社区",
  description: "公开浏览、审核后互动、圈子沉淀、可治理的兴趣社区 MVP。"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
