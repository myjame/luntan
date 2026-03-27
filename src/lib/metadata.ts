import type { Metadata } from "next";

import { appConfig } from "@/server/config/app-config";

export const siteDescription = "公开浏览、审核后互动、圈子沉淀、可治理的兴趣社区 MVP。";

export const metadataBase = (() => {
  try {
    return new URL(appConfig.appUrl);
  } catch {
    return new URL("http://localhost:3000");
  }
})();

export const siteOrigin = metadataBase.origin;

export const siteTitle = `${appConfig.siteName} | 公开兴趣社区`;

function normalizeDescription(value: string, maxLength = 160) {
  const compact = value.replace(/\s+/g, " ").trim();

  if (compact.length <= maxLength) {
    return compact;
  }

  return `${compact.slice(0, maxLength - 1).trimEnd()}…`;
}

function dedupeKeywords(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value))
    )
  );
}

export function absoluteUrl(path: string) {
  return new URL(path, metadataBase).toString();
}

export function buildSeoMetadata(input: {
  title: string;
  description: string;
  path: string;
  keywords?: Array<string | null | undefined>;
  type?: "website" | "article";
  image?: string | null;
  publishedTime?: Date | null;
  modifiedTime?: Date | null;
}): Metadata {
  const description = normalizeDescription(input.description);
  const canonical = absoluteUrl(input.path);
  const imageUrl = input.image ? absoluteUrl(input.image) : undefined;
  const pageTitle = `${input.title} | ${appConfig.siteName}`;

  return {
    title: input.title,
    description,
    keywords: dedupeKeywords(input.keywords ?? []),
    alternates: {
      canonical
    },
    openGraph: {
      type: input.type ?? "website",
      title: pageTitle,
      description,
      url: canonical,
      siteName: appConfig.siteName,
      locale: "zh_CN",
      ...(imageUrl
        ? {
            images: [{ url: imageUrl }]
          }
        : {}),
      ...(input.publishedTime
        ? {
            publishedTime: input.publishedTime.toISOString()
          }
        : {}),
      ...(input.modifiedTime
        ? {
            modifiedTime: input.modifiedTime.toISOString()
          }
        : {})
    },
    twitter: {
      card: imageUrl ? "summary_large_image" : "summary",
      title: pageTitle,
      description,
      ...(imageUrl
        ? {
            images: [imageUrl]
          }
        : {})
    }
  };
}
