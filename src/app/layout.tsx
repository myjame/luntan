import type { Metadata } from "next";

import { metadataBase, siteDescription, siteTitle } from "@/lib/metadata";
import { appConfig } from "@/server/config/app-config";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase,
  applicationName: appConfig.siteName,
  title: {
    default: siteTitle,
    template: `%s | ${appConfig.siteName}`
  },
  description: siteDescription,
  keywords: ["兴趣社区", "公开社区", "圈子讨论", "帖子互动", "社区运营"],
  alternates: {
    canonical: "/"
  },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    siteName: appConfig.siteName,
    title: siteTitle,
    description: siteDescription,
    url: "/"
  },
  twitter: {
    card: "summary",
    title: siteTitle,
    description: siteDescription
  }
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
