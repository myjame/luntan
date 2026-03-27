import type { MetadataRoute } from "next";

import { CircleStatus, ContentStatus } from "@/generated/prisma/client";
import { absoluteUrl } from "@/lib/metadata";
import { prisma } from "@/server/db/prisma";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [circles, posts] = await Promise.all([
    prisma.circle.findMany({
      where: {
        status: CircleStatus.ACTIVE,
        deletedAt: null
      },
      select: {
        slug: true,
        updatedAt: true
      },
      orderBy: [{ updatedAt: "desc" }]
    }),
    prisma.post.findMany({
      where: {
        status: ContentStatus.PUBLISHED,
        deletedAt: null,
        circle: {
          is: {
            status: CircleStatus.ACTIVE,
            deletedAt: null
          }
        }
      },
      select: {
        id: true,
        publishedAt: true,
        updatedAt: true
      },
      orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }]
    })
  ]);

  return [
    {
      url: absoluteUrl("/"),
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1
    },
    {
      url: absoluteUrl("/circles"),
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9
    },
    {
      url: absoluteUrl("/discover"),
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8
    },
    {
      url: absoluteUrl("/square"),
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.8
    },
    ...circles.map((circle) => ({
      url: absoluteUrl(`/circles/${circle.slug}`),
      lastModified: circle.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.8
    })),
    ...posts.map((post) => ({
      url: absoluteUrl(`/posts/${post.id}`),
      lastModified: post.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.7
    }))
  ];
}
