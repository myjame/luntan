import "server-only";

import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import {
  AttachmentKind,
  CircleManagerRole,
  CircleStatus,
  ContentStatus,
  HomeFeedChannel,
  NotificationType,
  PollResultVisibility,
  PostType,
  TagScope,
  type Prisma,
  type UserRole
} from "@/generated/prisma/client";
import {
  awardCommentCreatePoints,
  awardPostCreatePoints
} from "@/modules/growth/lib/service";
import { prisma } from "@/server/db/prisma";
import { appConfig } from "@/server/config/app-config";

import type {
  HomeFeedChannelValue,
  PollResultVisibilityValue,
  PostTypeValue,
  SquareSortValue
} from "@/modules/posts/lib/constants";
import {
  attachmentExtensionAllowlist,
  maxAttachmentCount,
  maxAttachmentSizeBytes
} from "@/modules/posts/lib/constants";
import {
  extractMentionUsernames,
  findMentionedUsers,
  linkifyMentionsInEscapedText
} from "@/modules/notifications/lib/mentions";
import { createNotifications } from "@/modules/notifications/lib/service";
import { getContentModerationDecision } from "@/modules/moderation/lib/service";
import { commentEditorSchema, postEditorSchema } from "@/modules/posts/lib/validation";
import { consumeRateLimit } from "@/server/rate-limit";

function validationErrors(error: unknown) {
  if (!(error instanceof Error) || !("issues" in error)) {
    return undefined;
  }

  const issues = (error as { issues: Array<{ path: PropertyKey[]; message: string }> }).issues;

  return Object.fromEntries(
    issues.map((issue) => [String(issue.path[0] ?? "form"), issue.message])
  ) as Record<string, string>;
}

const postFeedSelect = {
  id: true,
  title: true,
  excerpt: true,
  postType: true,
  isAnonymous: true,
  isPinned: true,
  isFeatured: true,
  isRecommended: true,
  viewCount: true,
  commentCount: true,
  reactionCount: true,
  favoriteCount: true,
  publishedAt: true,
  createdAt: true,
  circle: {
    select: {
      id: true,
      name: true,
      slug: true,
      category: {
        select: {
          name: true,
          slug: true
        }
      }
    }
  },
  author: {
    select: {
      id: true,
      username: true,
      profile: {
        select: {
          nickname: true
        }
      }
    }
  },
  tags: {
    orderBy: [{ createdAt: "asc" }],
    select: {
      tag: {
        select: {
          id: true,
          name: true,
          slug: true,
          scope: true
        }
      }
    }
  },
  poll: {
    select: {
      question: true,
      allowMultiple: true,
      resultVisibility: true,
      expiresAt: true,
      options: {
        orderBy: [{ sortOrder: "asc" }],
        select: {
          id: true,
          label: true,
          voteCount: true
        }
      }
    }
  }
} satisfies Prisma.PostSelect;

const postDetailSelect = {
  ...postFeedSelect,
  status: true,
  deletedAt: true,
  contentHtml: true,
  contentJson: true,
  updatedAt: true,
  attachments: {
    orderBy: [{ createdAt: "asc" }],
    select: {
      id: true,
      originalName: true,
      mimeType: true,
      extension: true,
      sizeBytes: true,
      accessUrl: true,
      createdAt: true
    }
  },
  circle: {
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      deletedAt: true,
      allowAnonymous: true,
      category: {
        select: {
          name: true,
          slug: true
        }
      }
    }
  }
} satisfies Prisma.PostSelect;

const postSeoSelect = {
  ...postFeedSelect,
  status: true,
  deletedAt: true,
  updatedAt: true,
  circle: {
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      deletedAt: true,
      category: {
        select: {
          name: true,
          slug: true
        }
      }
    }
  }
} satisfies Prisma.PostSelect;

const editablePostSelect = {
  id: true,
  authorId: true,
  postType: true,
  title: true,
  contentJson: true,
  isAnonymous: true,
  deletedAt: true,
  circle: {
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      deletedAt: true,
      allowAnonymous: true,
      ownerId: true,
      coverUrl: true,
      iconUrl: true,
      intro: true,
      category: {
        select: {
          name: true
        }
      },
      managers: {
        where: {
          role: {
            in: [CircleManagerRole.OWNER, CircleManagerRole.MANAGER]
          }
        },
        select: {
          userId: true,
          role: true
        }
      }
    }
  },
  tags: {
    select: {
      tag: {
        select: {
          name: true,
          scope: true
        }
      }
    }
  },
  poll: {
    select: {
      question: true,
      allowMultiple: true,
      resultVisibility: true,
      expiresAt: true,
      options: {
        orderBy: [{ sortOrder: "asc" }],
        select: {
          label: true
        }
      }
    }
  },
  attachments: {
    orderBy: [{ createdAt: "asc" }],
    select: {
      id: true,
      originalName: true,
      sizeBytes: true
    }
  }
} satisfies Prisma.PostSelect;

const commentReplySelect = {
  id: true,
  postId: true,
  authorId: true,
  parentId: true,
  rootId: true,
  contentHtml: true,
  contentJson: true,
  isAnonymous: true,
  replyCount: true,
  createdAt: true,
  updatedAt: true,
  author: {
    select: {
      id: true,
      username: true,
      profile: {
        select: {
          nickname: true
        }
      }
    }
  }
} satisfies Prisma.CommentSelect;

const commentThreadSelect = {
  ...commentReplySelect,
  replies: {
    where: {
      status: ContentStatus.PUBLISHED,
      deletedAt: null
    },
    orderBy: [{ createdAt: "asc" }],
    select: commentReplySelect
  }
} satisfies Prisma.CommentSelect;

const hotTagSelect = {
  id: true,
  name: true,
  slug: true,
  scope: true,
  _count: {
    select: {
      postTags: true
    }
  }
} satisfies Prisma.TagSelect;

export type PostFeedItem = Prisma.PostGetPayload<{
  select: typeof postFeedSelect;
}>;

export type PostDetailItem = Prisma.PostGetPayload<{
  select: typeof postDetailSelect;
}>;

export type HotTagItem = Prisma.TagGetPayload<{
  select: typeof hotTagSelect;
}>;

export type CommentThreadItem = Prisma.CommentGetPayload<{
  select: typeof commentThreadSelect;
}>;

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeContent(value: string) {
  return value.replace(/\r\n/g, "\n").trim();
}

function parseMediaUrls(value: string) {
  return Array.from(
    new Set(
      value
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

function getMediaFileType(url: string) {
  return /\.(gif)(?:\?.*)?$/i.test(url) ? "gif" : "image";
}

function buildMediaHtml(mediaUrls: string[]) {
  if (mediaUrls.length === 0) {
    return "";
  }

  const items = mediaUrls
    .map((url) => {
      const safeUrl = escapeHtml(url);
      const label = getMediaFileType(url) === "gif" ? "GIF" : "图片";

      return `<figure class="post-media-card"><img alt="${label}" class="post-media-image" loading="lazy" src="${safeUrl}" /></figure>`;
    })
    .join("");

  return `<div class="post-media-grid">${items}</div>`;
}

function buildContentPayload(content: string, mediaInput = "") {
  const normalized = normalizeContent(content);
  const mediaUrls = parseMediaUrls(mediaInput);
  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((paragraph) => {
      const escapedParagraph = escapeHtml(paragraph).replace(/\n/g, "<br />");

      return `<p>${linkifyMentionsInEscapedText(escapedParagraph)}</p>`;
    })
    .join("");

  return {
    contentJson: {
      type: "plain_text",
      text: normalized,
      mediaUrls
    } satisfies Prisma.JsonObject,
    contentHtml: `${paragraphs}${buildMediaHtml(mediaUrls)}`,
    excerpt:
      normalized.length > 120 ? `${normalized.slice(0, 120).trimEnd()}...` : normalized
  };
}

function extractContentText(value: Prisma.JsonValue) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return "";
  }

  const text = (value as { text?: unknown }).text;

  return typeof text === "string" ? text : "";
}

function extractMediaUrls(value: Prisma.JsonValue) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [];
  }

  const mediaUrls = (value as { mediaUrls?: unknown }).mediaUrls;

  return Array.isArray(mediaUrls)
    ? mediaUrls.filter((item): item is string => typeof item === "string")
    : [];
}

function normalizePageTake(value: number | undefined, fallback: number, max: number) {
  if (!value || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(1, Math.min(max, Math.floor(value)));
}

function parseTagNames(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[,\n，]/)
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

function toTagSlug(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}\s-]+/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized || value.trim().toLowerCase();
}

function parsePollOptions(value: string) {
  return Array.from(
    new Set(
      value
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

function formatDateTimeLocal(value: Date) {
  return new Date(value.getTime() - value.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

function isAttachmentAllowed(extension: string) {
  return attachmentExtensionAllowlist.includes(
    extension as (typeof attachmentExtensionAllowlist)[number]
  );
}

function getAttachmentKind(extension: string) {
  return extension === "zip" ? AttachmentKind.ARCHIVE : AttachmentKind.DOCUMENT;
}

function validateAttachmentFiles(files: File[]) {
  if (files.length > maxAttachmentCount) {
    return `单次最多上传 ${maxAttachmentCount} 个附件。`;
  }

  for (const file of files) {
    if (!(file instanceof File) || file.size === 0) {
      continue;
    }

    const extension = path.extname(file.name).toLowerCase().replace(/^\./, "");

    if (!isAttachmentAllowed(extension)) {
      return `附件 ${file.name} 的类型不在白名单内。`;
    }

    if (file.size > maxAttachmentSizeBytes) {
      return `附件 ${file.name} 超过 10MB 限制。`;
    }
  }

  return null;
}

async function storePostAttachments(
  tx: Prisma.TransactionClient,
  input: {
    postId: string;
    uploaderId: string;
    files: File[];
  }
) {
  if (input.files.length === 0) {
    return;
  }

  const baseDir = path.resolve(appConfig.uploadDir, "post-attachments");

  await mkdir(baseDir, { recursive: true });

  for (const file of input.files) {
    if (!(file instanceof File) || file.size === 0) {
      continue;
    }

    const extension = path.extname(file.name).toLowerCase().replace(/^\./, "");

    if (!isAttachmentAllowed(extension)) {
      throw new Error(`不支持上传 ${extension || "未知类型"} 附件。`);
    }

    if (file.size > maxAttachmentSizeBytes) {
      throw new Error(`附件 ${file.name} 超过大小限制。`);
    }

    const fileName = `${randomUUID()}.${extension}`;
    const relativePath = path.join("post-attachments", fileName);
    const storagePath = path.join(baseDir, fileName);
    const buffer = Buffer.from(await file.arrayBuffer());

    await writeFile(storagePath, buffer);

    const attachment = await tx.postAttachment.create({
      data: {
        postId: input.postId,
        uploaderId: input.uploaderId,
        kind: getAttachmentKind(extension),
        originalName: file.name,
        fileName,
        mimeType: file.type || "application/octet-stream",
        extension,
        storagePath: relativePath,
        accessUrl: null,
        sizeBytes: file.size
      },
      select: {
        id: true
      }
    });

    await tx.postAttachment.update({
      where: {
        id: attachment.id
      },
      data: {
        accessUrl: `/api/attachments/${attachment.id}`
      }
    });
  }
}

async function removePostAttachments(
  tx: Prisma.TransactionClient,
  input: {
    postId: string;
    attachmentIds: string[];
  }
) {
  if (input.attachmentIds.length === 0) {
    return;
  }

  const attachments = await tx.postAttachment.findMany({
    where: {
      postId: input.postId,
      id: {
        in: input.attachmentIds
      }
    },
    select: {
      id: true,
      storagePath: true
    }
  });

  if (attachments.length === 0) {
    return;
  }

  await tx.postAttachment.deleteMany({
    where: {
      id: {
        in: attachments.map((item) => item.id)
      }
    }
  });

  await Promise.all(
    attachments.map(async (item) => {
      try {
        await unlink(path.resolve(appConfig.uploadDir, item.storagePath));
      } catch {
        // Ignore missing files; the DB state is the source of truth.
      }
    })
  );
}

function parseDateTimeLocal(value: string) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function canPublishAnnouncement(input: {
  actorId: string;
  actorRole: UserRole;
  ownerId: string | null;
  managerUserIds: string[];
}) {
  if (input.actorRole === "SUPER_ADMIN") {
    return true;
  }

  if (input.ownerId === input.actorId) {
    return true;
  }

  return input.managerUserIds.includes(input.actorId);
}

function buildFeedOrderBy(channel: HomeFeedChannelValue): Prisma.PostOrderByWithRelationInput[] {
  if (channel === "HOT") {
    return [
      { isPinned: "desc" },
      { scoreHot: "desc" },
      { commentCount: "desc" },
      { reactionCount: "desc" },
      { publishedAt: "desc" }
    ];
  }

  if (channel === "NEWEST" || channel === "FOLLOWING") {
    return [{ isPinned: "desc" }, { publishedAt: "desc" }, { createdAt: "desc" }];
  }

  return [
    { isPinned: "desc" },
    { isRecommended: "desc" },
    { isFeatured: "desc" },
    { scoreHot: "desc" },
    { publishedAt: "desc" }
  ];
}

function buildSquareOrderBy(sort: SquareSortValue): Prisma.PostOrderByWithRelationInput[] {
  return sort === "NEWEST"
    ? [{ isPinned: "desc" }, { publishedAt: "desc" }, { createdAt: "desc" }]
    : [
        { isPinned: "desc" },
        { scoreHot: "desc" },
        { commentCount: "desc" },
        { reactionCount: "desc" },
        { publishedAt: "desc" }
      ];
}

async function syncPostTags(
  tx: Prisma.TransactionClient,
  input: {
    postId: string;
    circleId: string;
    globalTagNames: string[];
    circleTagNames: string[];
  }
) {
  await tx.postTag.deleteMany({
    where: {
      postId: input.postId
    }
  });

  const allTags = [
    ...input.globalTagNames.map((name) => ({
      name,
      slug: toTagSlug(name),
      scope: TagScope.GLOBAL,
      circleId: null as string | null
    })),
    ...input.circleTagNames.map((name) => ({
      name,
      slug: toTagSlug(name),
      scope: TagScope.CIRCLE,
      circleId: input.circleId
    }))
  ];

  for (const tagInput of allTags) {
    const existingTag = await tx.tag.findFirst({
      where: {
        scope: tagInput.scope,
        circleId: tagInput.circleId,
        slug: tagInput.slug
      },
      select: {
        id: true,
        name: true
      }
    });

    const tagId = existingTag
      ? existingTag.id
      : (
          await tx.tag.create({
            data: {
              circleId: tagInput.circleId,
              name: tagInput.name,
              slug: tagInput.slug,
              scope: tagInput.scope
            },
            select: {
              id: true
            }
          })
        ).id;

    if (existingTag && existingTag.name !== tagInput.name) {
      await tx.tag.update({
        where: {
          id: existingTag.id
        },
        data: {
          name: tagInput.name
        }
      });
    }

    await tx.postTag.create({
      data: {
        postId: input.postId,
        tagId
      }
    });
  }
}

async function syncPoll(
  tx: Prisma.TransactionClient,
  input: {
    postId: string;
    postType: PostTypeValue;
    pollQuestion: string;
    pollOptions: string;
    allowMultiple: boolean;
    resultVisibility: PollResultVisibilityValue;
    expiresAt: string;
  }
) {
  const existingPoll = await tx.poll.findUnique({
    where: {
      postId: input.postId
    },
    select: {
      id: true
    }
  });

  if (input.postType !== "POLL") {
    if (existingPoll) {
      await tx.poll.delete({
        where: {
          postId: input.postId
        }
      });
    }

    return;
  }

  const optionList = parsePollOptions(input.pollOptions);
  const expiresAt = parseDateTimeLocal(input.expiresAt);

  if (!existingPoll) {
    await tx.poll.create({
      data: {
        postId: input.postId,
        question: input.pollQuestion,
        allowMultiple: input.allowMultiple,
        resultVisibility: input.resultVisibility as PollResultVisibility,
        expiresAt,
        options: {
          create: optionList.map((label, index) => ({
            label,
            sortOrder: index + 1
          }))
        }
      }
    });

    return;
  }

  await tx.poll.update({
    where: {
      postId: input.postId
    },
    data: {
      question: input.pollQuestion,
      allowMultiple: input.allowMultiple,
      resultVisibility: input.resultVisibility as PollResultVisibility,
      expiresAt
    }
  });

  await tx.pollVote.deleteMany({
    where: {
      pollId: existingPoll.id
    }
  });

  await tx.pollOption.deleteMany({
    where: {
      pollId: existingPoll.id
    }
  });

  for (const [index, label] of optionList.entries()) {
    await tx.pollOption.create({
      data: {
        pollId: existingPoll.id,
        label,
        sortOrder: index + 1
      }
    });
  }
}

async function getPostingCircleContext(input: {
  circleId: string;
  actorId: string;
  actorRole: UserRole;
}) {
  const circle = await prisma.circle.findUnique({
    where: {
      id: input.circleId
    },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      deletedAt: true,
      allowAnonymous: true,
      ownerId: true,
      category: {
        select: {
          name: true
        }
      },
      managers: {
        where: {
          role: {
            in: [CircleManagerRole.OWNER, CircleManagerRole.MANAGER]
          }
        },
        select: {
          userId: true,
          role: true
        }
      }
    }
  });

  if (!circle || circle.status !== CircleStatus.ACTIVE || circle.deletedAt) {
    return null;
  }

  const managerUserIds = circle.managers.map((item) => item.userId);

  return {
    circle,
    canCreateAnnouncement: canPublishAnnouncement({
      actorId: input.actorId,
      actorRole: input.actorRole,
      ownerId: circle.ownerId,
      managerUserIds
    })
  };
}

export async function listCirclePostsBySlug(input: { slug: string; take?: number }) {
  return prisma.post.findMany({
    where: {
      status: ContentStatus.PUBLISHED,
      deletedAt: null,
      circle: {
        is: {
          slug: input.slug,
          status: CircleStatus.ACTIVE,
          deletedAt: null
        }
      }
    },
    select: postFeedSelect,
    orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
    take: normalizePageTake(input.take, 6, 20)
  });
}

export async function listPostsByAuthorId(input: {
  authorId: string;
  take?: number;
  includeAnonymous?: boolean;
}) {
  return prisma.post.findMany({
    where: {
      authorId: input.authorId,
      status: ContentStatus.PUBLISHED,
      deletedAt: null,
      ...(input.includeAnonymous === false ? { isAnonymous: false } : {}),
      circle: {
        is: {
          status: CircleStatus.ACTIVE,
          deletedAt: null
        }
      }
    },
    select: postFeedSelect,
    orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
    take: normalizePageTake(input.take, 6, 24)
  });
}

export async function listFavoritePostsByUserId(input: {
  userId: string;
  take?: number;
}) {
  const favorites = await prisma.favorite.findMany({
    where: {
      userId: input.userId,
      post: {
        is: {
          status: ContentStatus.PUBLISHED,
          deletedAt: null,
          circle: {
            is: {
              status: CircleStatus.ACTIVE,
              deletedAt: null
            }
          }
        }
      }
    },
    orderBy: [{ createdAt: "desc" }],
    select: {
      post: {
        select: postFeedSelect
      }
    },
    take: normalizePageTake(input.take, 6, 24)
  });

  return favorites.map((item) => item.post);
}

export async function listHomeFeedPosts(input: {
  channel: HomeFeedChannelValue;
  userId?: string | null;
  take?: number;
}) {
  if (input.channel === "FOLLOWING" && !input.userId) {
    return [];
  }

  return prisma.post.findMany({
    where: {
      status: ContentStatus.PUBLISHED,
      deletedAt: null,
      circle: {
        is: {
          status: CircleStatus.ACTIVE,
          deletedAt: null
        }
      },
      ...(input.channel === "FOLLOWING" && input.userId
        ? {
            OR: [
              {
                circle: {
                  is: {
                    status: CircleStatus.ACTIVE,
                    deletedAt: null,
                    follows: {
                      some: {
                        userId: input.userId
                      }
                    }
                  }
                }
              },
              {
                author: {
                  is: {
                    followers: {
                      some: {
                        followerId: input.userId
                      }
                    }
                  }
                }
              }
            ]
          }
        : {})
    },
    select: postFeedSelect,
    orderBy: buildFeedOrderBy(input.channel),
    take: normalizePageTake(input.take, 6, 18)
  });
}

export async function listSquarePosts(input: {
  sort: SquareSortValue;
  take?: number;
}) {
  return prisma.post.findMany({
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
    select: postFeedSelect,
    orderBy: buildSquareOrderBy(input.sort),
    take: normalizePageTake(input.take, 12, 24)
  });
}

export async function listHotGlobalTags(take = 8) {
  return prisma.tag.findMany({
    where: {
      scope: TagScope.GLOBAL,
      postTags: {
        some: {
          post: {
            status: ContentStatus.PUBLISHED,
            deletedAt: null
          }
        }
      }
    },
    select: hotTagSelect,
    orderBy: [{ postTags: { _count: "desc" } }, { updatedAt: "desc" }],
    take: normalizePageTake(take, 8, 12)
  });
}

export async function listCircleHotTags(circleId: string, take = 6) {
  return prisma.tag.findMany({
    where: {
      scope: TagScope.CIRCLE,
      circleId,
      postTags: {
        some: {
          post: {
            status: ContentStatus.PUBLISHED,
            deletedAt: null
          }
        }
      }
    },
    select: hotTagSelect,
    orderBy: [{ postTags: { _count: "desc" } }, { updatedAt: "desc" }],
    take: normalizePageTake(take, 6, 10)
  });
}

export async function rememberHomeFeedChannel(userId: string, channel: HomeFeedChannelValue) {
  await prisma.userSetting.upsert({
    where: {
      userId
    },
    update: {
      homepageLastFeedChannel: channel as HomeFeedChannel
    },
    create: {
      userId,
      homepageLastFeedChannel: channel as HomeFeedChannel
    }
  });
}

export async function getPostComposerContext(input: {
  slug: string;
  actorId: string;
  actorRole: UserRole;
}) {
  const circle = await prisma.circle.findUnique({
    where: {
      slug: input.slug
    },
    select: {
      id: true,
      name: true,
      slug: true,
      intro: true,
      status: true,
      deletedAt: true,
      allowAnonymous: true,
      ownerId: true,
      category: {
        select: {
          name: true
        }
      },
      managers: {
        where: {
          role: {
            in: [CircleManagerRole.OWNER, CircleManagerRole.MANAGER]
          }
        },
        select: {
          userId: true
        }
      }
    }
  });

  if (!circle || circle.status !== CircleStatus.ACTIVE || circle.deletedAt) {
    return null;
  }

  return {
    circle,
    canCreateAnnouncement: canPublishAnnouncement({
      actorId: input.actorId,
      actorRole: input.actorRole,
      ownerId: circle.ownerId,
      managerUserIds: circle.managers.map((item) => item.userId)
    })
  };
}

export async function getEditablePostById(input: {
  postId: string;
  actorId: string;
  actorRole: UserRole;
}) {
  const post = await prisma.post.findUnique({
    where: {
      id: input.postId
    },
    select: editablePostSelect
  });

  if (!post || post.deletedAt || post.authorId !== input.actorId) {
    return null;
  }

  if (post.circle.status !== CircleStatus.ACTIVE || post.circle.deletedAt) {
    return null;
  }

  const managerUserIds = post.circle.managers.map((item) => item.userId);
  const canCreateAnnouncement =
    post.postType === PostType.ANNOUNCEMENT ||
    canPublishAnnouncement({
      actorId: input.actorId,
      actorRole: input.actorRole,
      ownerId: post.circle.ownerId,
      managerUserIds
    });

  return {
    post: {
      id: post.id,
      circleId: post.circle.id,
      circleName: post.circle.name,
      circleSlug: post.circle.slug,
      categoryName: post.circle.category.name,
      title: post.title,
      postType: post.postType as PostTypeValue,
      content: extractContentText(post.contentJson),
      mediaUrls: extractMediaUrls(post.contentJson).join("\n"),
      isAnonymous: post.isAnonymous,
      globalTags: post.tags
        .filter((item) => item.tag.scope === TagScope.GLOBAL)
        .map((item) => item.tag.name)
        .join(", "),
      circleTags: post.tags
        .filter((item) => item.tag.scope === TagScope.CIRCLE)
        .map((item) => item.tag.name)
        .join(", "),
      pollQuestion: post.poll?.question ?? "",
      pollOptions: post.poll?.options.map((item) => item.label).join("\n") ?? "",
      allowMultiple: post.poll?.allowMultiple ?? false,
      resultVisibility:
        (post.poll?.resultVisibility as PollResultVisibilityValue | undefined) ??
        "ALWAYS_PUBLIC",
      expiresAt: post.poll?.expiresAt ? formatDateTimeLocal(post.poll.expiresAt) : "",
      attachments: post.attachments.map((attachment) => ({
        id: attachment.id,
        originalName: attachment.originalName,
        sizeBytes: attachment.sizeBytes
      }))
    },
    canCreateAnnouncement,
    anonymousAvailable: post.circle.allowAnonymous
  };
}

export async function getPublicPostDetail(
  postId: string,
  currentUserId?: string | null,
  currentUserRole?: UserRole | null
) {
  const [post, currentUserVotes] = await Promise.all([
    prisma.post.findUnique({
      where: {
        id: postId
      },
      select: postDetailSelect
    }),
    currentUserId
      ? prisma.pollVote.findMany({
          where: {
            userId: currentUserId,
            poll: {
              is: {
                postId
              }
            }
          },
          select: {
            optionId: true
          }
        })
      : Promise.resolve([])
  ]);

  if (
    !post ||
    post.deletedAt ||
    post.status !== ContentStatus.PUBLISHED ||
    post.circle.deletedAt ||
    post.circle.status !== CircleStatus.ACTIVE
  ) {
    return null;
  }

  await prisma.post.update({
    where: {
      id: post.id
    },
    data: {
      viewCount: {
        increment: 1
      },
      scoreHot: {
        increment: 0.08
      }
    }
  });

  const selectedOptionIds = currentUserVotes.map((item) => item.optionId);
  const hasVoted = selectedOptionIds.length > 0;
  const isPollExpired = post.poll?.expiresAt
    ? post.poll.expiresAt.getTime() <= Date.now()
    : false;
  const canSeePollResults = Boolean(
    post.poll &&
      (post.poll.resultVisibility === PollResultVisibility.ALWAYS_PUBLIC ||
        hasVoted ||
        currentUserRole === "SUPER_ADMIN")
  );

  return {
    post: {
      ...post,
      viewCount: post.viewCount + 1
    },
    canEdit: Boolean(currentUserId && currentUserId === post.author.id),
    canRevealAuthor: currentUserRole === "SUPER_ADMIN",
    pollState: post.poll
      ? {
          hasVoted,
          selectedOptionIds,
          isExpired: isPollExpired,
          canSeeResults: canSeePollResults
        }
      : null
  };
}

export async function getPublicPostSeoDetail(postId: string) {
  const post = await prisma.post.findUnique({
    where: {
      id: postId
    },
    select: postSeoSelect
  });

  if (
    !post ||
    post.deletedAt ||
    post.status !== ContentStatus.PUBLISHED ||
    post.circle.deletedAt ||
    post.circle.status !== CircleStatus.ACTIVE
  ) {
    return null;
  }

  return post;
}

export async function listPostComments(postId: string) {
  return prisma.comment.findMany({
    where: {
      postId,
      status: ContentStatus.PUBLISHED,
      deletedAt: null,
      parentId: null
    },
    orderBy: [{ createdAt: "asc" }],
    select: commentThreadSelect
  });
}

export async function createComment(
  actor: {
    id: string;
    username: string;
    role: UserRole;
    settings?: { allowAnonymousComments: boolean } | null;
  },
  rawInput: Record<string, FormDataEntryValue | undefined>
) {
  const parsed = commentEditorSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      ok: false,
      message: "请检查评论内容后再提交。",
      fieldErrors: validationErrors(parsed.error)
    };
  }

  const post = await prisma.post.findUnique({
    where: {
      id: parsed.data.postId
    },
    select: {
      id: true,
      title: true,
      authorId: true,
      status: true,
      deletedAt: true,
      circle: {
        select: {
          id: true,
          slug: true,
          name: true,
          status: true,
          deletedAt: true,
          allowAnonymous: true
        }
      }
    }
  });

  if (
    !post ||
    post.deletedAt ||
    post.status !== ContentStatus.PUBLISHED ||
    post.circle.deletedAt ||
    post.circle.status !== CircleStatus.ACTIVE
  ) {
    return {
      ok: false,
      message: "当前帖子暂时不能评论。"
    };
  }

  if (parsed.data.isAnonymous && !post.circle.allowAnonymous) {
    return {
      ok: false,
      message: "当前圈子未开启匿名评论。",
      fieldErrors: {
        isAnonymous: "当前圈子未开启匿名评论"
      }
    };
  }

  if (parsed.data.isAnonymous && actor.settings?.allowAnonymousComments === false) {
    return {
      ok: false,
      message: "你的账号设置已关闭匿名评论。",
      fieldErrors: {
        isAnonymous: "请先在账号设置中开启匿名评论"
      }
    };
  }

  let parentComment:
    | {
        id: string;
        parentId: string | null;
        authorId: string;
      }
    | null = null;

  if (parsed.data.parentId) {
    parentComment = await prisma.comment.findFirst({
      where: {
        id: parsed.data.parentId,
        postId: parsed.data.postId,
        status: ContentStatus.PUBLISHED,
        deletedAt: null
      },
      select: {
        id: true,
        parentId: true,
        authorId: true
      }
    });

    if (!parentComment) {
      return {
        ok: false,
        message: "未找到要回复的评论。"
      };
    }

    if (parentComment.parentId) {
      return {
        ok: false,
        message: "当前只支持一层回复。"
      };
    }
  }

  const contentPayload = buildContentPayload(parsed.data.content, parsed.data.mediaUrls);
  const mentionUsernames = extractMentionUsernames(parsed.data.content);
  const now = new Date();
  const rateLimit = await consumeRateLimit({
    key: `comment:${actor.id}`,
    limit: 20,
    windowMs: 10 * 60 * 1000
  });

  if (!rateLimit.ok) {
    return {
      ok: false,
      message: "评论过于频繁，请稍后再试。"
    };
  }

  const moderation = await getContentModerationDecision(prisma, {
    authorId: actor.id,
    contentType: "COMMENT",
    text: parsed.data.content,
    respectObservationPeriod: true
  });

  if (!moderation.ok) {
    return {
      ok: false,
      message: moderation.message,
      fieldErrors: {
        content: moderation.message
      }
    };
  }

  await prisma.$transaction(async (tx) => {
    const createdComment = await tx.comment.create({
      data: {
        postId: post.id,
        authorId: actor.id,
        parentId: parentComment?.id ?? null,
        rootId: parentComment?.id ?? null,
        contentJson: contentPayload.contentJson,
        contentHtml: contentPayload.contentHtml,
        isAnonymous: parsed.data.isAnonymous,
        status: moderation.status,
        reviewNote: moderation.status === ContentStatus.PENDING_REVIEW ? moderation.reviewNote : null
      },
      select: {
        id: true
      }
    });

    if (moderation.status === ContentStatus.PUBLISHED) {
      await tx.post.update({
        where: {
          id: post.id
        },
        data: {
          commentCount: {
            increment: 1
          },
          scoreHot: {
            increment: 0.4
          }
        }
      });

      await awardCommentCreatePoints(tx, {
        userId: actor.id,
        commentId: createdComment.id,
        postId: post.id,
        postTitle: post.title
      });

      if (parentComment) {
        await tx.comment.update({
          where: {
            id: parentComment.id
          },
          data: {
            replyCount: {
              increment: 1
            }
          }
        });
      }
    }

    await tx.userProfile.updateMany({
      where: {
        userId: actor.id
      },
      data: {
        lastActiveAt: now
      }
    });

    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        action:
          moderation.status === ContentStatus.PUBLISHED
            ? "create_comment"
            : "submit_comment_for_review",
        entityType: "comment",
        payloadJson: {
          postId: post.id,
          postTitle: post.title,
          circleName: post.circle.name,
          circleSlug: post.circle.slug,
          parentId: parentComment?.id ?? null,
          isAnonymous: parsed.data.isAnonymous,
          moderationStatus: moderation.status,
          reviewNote: moderation.status === ContentStatus.PENDING_REVIEW ? moderation.reviewNote : null
        }
      }
    });

    if (moderation.status === ContentStatus.PENDING_REVIEW) {
      return;
    }

    const notificationInputs: Parameters<typeof createNotifications>[1] = [];

    if (parentComment && parentComment.authorId !== actor.id) {
      notificationInputs.push({
        userId: parentComment.authorId,
        type: NotificationType.REPLY,
        payload: {
          title: "你收到了一条回复",
          body: `${actor.username} 回复了你在《${post.title}》下的评论。`,
          href: `/posts/${post.id}#comment-${createdComment.id}`,
          actorUsername: actor.username,
          actorDisplayName: actor.username
        }
      });
    } else if (!parentComment && post.authorId !== actor.id) {
      notificationInputs.push({
        userId: post.authorId,
        type: NotificationType.COMMENT,
        payload: {
          title: "你的帖子收到新评论",
          body: `${actor.username} 评论了你的帖子《${post.title}》。`,
          href: `/posts/${post.id}#comment-${createdComment.id}`,
          actorUsername: actor.username,
          actorDisplayName: actor.username
        }
      });
    }

    const excludedMentionUserIds = new Set([
      actor.id,
      parentComment?.authorId ?? "",
      !parentComment ? post.authorId : ""
    ]);
    const mentionedUsers = (await findMentionedUsers(tx, mentionUsernames)).filter(
      (user) => !excludedMentionUserIds.has(user.id)
    );

    notificationInputs.push(
      ...mentionedUsers.map((user) => ({
        userId: user.id,
        type: NotificationType.MENTION,
        payload: {
          title: "你在评论中被提到了",
          body: `${actor.username} 在《${post.title}》的评论里提到了你。`,
          href: `/posts/${post.id}#comment-${createdComment.id}`,
          actorUsername: actor.username,
          actorDisplayName: actor.username
        }
      }))
    );

    await createNotifications(tx, notificationInputs);
  });

  return {
    ok: true,
    message:
      moderation.status === ContentStatus.PUBLISHED
        ? parentComment
          ? "回复已发布。"
          : "评论已发布。"
        : moderation.message,
    status: moderation.status
  } as const;
}

export async function updateComment(
  actor: {
    id: string;
    username: string;
    settings?: { allowAnonymousComments: boolean } | null;
  },
  commentId: string,
  rawInput: Record<string, FormDataEntryValue | undefined>
) {
  const parsed = commentEditorSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      ok: false,
      message: "请检查评论内容后再保存。",
      fieldErrors: validationErrors(parsed.error)
    };
  }

  const existingComment = await prisma.comment.findUnique({
    where: {
      id: commentId
    },
    select: {
      id: true,
      authorId: true,
      parentId: true,
      status: true,
      contentJson: true,
      contentHtml: true,
      deletedAt: true,
      post: {
        select: {
          id: true,
          title: true,
          circle: {
            select: {
              allowAnonymous: true,
              slug: true
            }
          }
        }
      }
    }
  });

  if (!existingComment || existingComment.deletedAt || existingComment.authorId !== actor.id) {
    return {
      ok: false,
      message: "你当前不能编辑这条评论。"
    };
  }

  if (parsed.data.isAnonymous && !existingComment.post.circle.allowAnonymous) {
    return {
      ok: false,
      message: "当前圈子未开启匿名评论。",
      fieldErrors: {
        isAnonymous: "当前圈子未开启匿名评论"
      }
    };
  }

  if (parsed.data.isAnonymous && actor.settings?.allowAnonymousComments === false) {
    return {
      ok: false,
      message: "你的账号设置已关闭匿名评论。",
      fieldErrors: {
        isAnonymous: "请先在账号设置中开启匿名评论"
      }
    };
  }

  const contentPayload = buildContentPayload(parsed.data.content, parsed.data.mediaUrls);
  const previousMentionUsernames = new Set(
    extractMentionUsernames(extractContentText(existingComment.contentJson)).map((username) =>
      username.toLowerCase()
    )
  );
  const newMentionUsernames = extractMentionUsernames(parsed.data.content);
  const moderation = await getContentModerationDecision(prisma, {
    authorId: actor.id,
    contentType: "COMMENT",
    text: parsed.data.content,
    respectObservationPeriod: existingComment.status !== ContentStatus.PUBLISHED
  });

  if (!moderation.ok) {
    return {
      ok: false,
      message: moderation.message,
      fieldErrors: {
        content: moderation.message
      }
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.commentRevision.create({
      data: {
        commentId: existingComment.id,
        editorId: actor.id,
        contentJson: existingComment.contentJson as Prisma.InputJsonValue,
        contentHtml: existingComment.contentHtml
      }
    });

    const nextStatus =
      existingComment.status === ContentStatus.PUBLISHED &&
      moderation.status === ContentStatus.PUBLISHED
        ? ContentStatus.PUBLISHED
        : ContentStatus.PENDING_REVIEW;

    await tx.comment.update({
      where: {
        id: existingComment.id
      },
      data: {
        contentJson: contentPayload.contentJson,
        contentHtml: contentPayload.contentHtml,
        isAnonymous: parsed.data.isAnonymous,
        status: nextStatus,
        reviewNote: nextStatus === ContentStatus.PENDING_REVIEW ? moderation.reviewNote : null,
        reviewedAt: nextStatus === ContentStatus.PENDING_REVIEW ? null : undefined,
        reviewedById: nextStatus === ContentStatus.PENDING_REVIEW ? null : undefined
      }
    });

    if (
      existingComment.status === ContentStatus.PUBLISHED &&
      nextStatus === ContentStatus.PENDING_REVIEW
    ) {
      await tx.post.update({
        where: {
          id: existingComment.post.id
        },
        data: {
          commentCount: {
            decrement: 1
          }
        }
      });

      if (existingComment.parentId) {
        await tx.comment.update({
          where: {
            id: existingComment.parentId
          },
          data: {
            replyCount: {
              decrement: 1
            }
          }
        });
      }
    }

    if (nextStatus === ContentStatus.PENDING_REVIEW) {
      return;
    }

    const addedMentionUsernames = newMentionUsernames.filter(
      (username) => !previousMentionUsernames.has(username.toLowerCase())
    );
    const mentionedUsers = (await findMentionedUsers(tx, addedMentionUsernames)).filter(
      (user) => user.id !== actor.id
    );

    await createNotifications(
      tx,
      mentionedUsers.map((user) => ({
        userId: user.id,
        type: NotificationType.MENTION,
        payload: {
          title: "你在评论中被提到了",
          body: `${actor.username} 在《${existingComment.post.title}》的评论里提到了你。`,
          href: `/posts/${existingComment.post.id}#comment-${existingComment.id}`,
          actorUsername: actor.username,
          actorDisplayName: actor.username
        }
      }))
    );
  });

  return {
    ok: true,
    message:
      existingComment.status === ContentStatus.PUBLISHED &&
      moderation.status === ContentStatus.PUBLISHED
        ? "评论已更新。"
        : moderation.message ?? "评论已更新，内容重新进入审核。",
    status:
      existingComment.status === ContentStatus.PUBLISHED &&
      moderation.status === ContentStatus.PUBLISHED
        ? ContentStatus.PUBLISHED
        : ContentStatus.PENDING_REVIEW
  } as const;
}

export async function deleteComment(input: {
  commentId: string;
  actorId: string;
}) {
  const comment = await prisma.comment.findUnique({
    where: {
      id: input.commentId
    },
    select: {
      id: true,
      authorId: true,
      parentId: true,
      status: true,
      deletedAt: true,
      post: {
        select: {
          id: true,
          circle: {
            select: {
              slug: true
            }
          }
        }
      }
    }
  });

  if (!comment || comment.authorId !== input.actorId) {
    return {
      ok: false,
      message: "你当前不能删除这条评论。"
    } as const;
  }

  if (comment.deletedAt || comment.status === ContentStatus.DELETED) {
    return {
      ok: true,
      message: "评论已经删除。"
    } as const;
  }

  await prisma.$transaction(async (tx) => {
    const descendantReplies = await tx.comment.findMany({
      where: {
        rootId: comment.id,
        status: ContentStatus.PUBLISHED,
        deletedAt: null
      },
      select: {
        id: true
      }
    });

    const targetIds = [comment.id, ...descendantReplies.map((item) => item.id)];

    await tx.comment.updateMany({
      where: {
        id: {
          in: targetIds
        }
      },
      data: {
        status: ContentStatus.DELETED,
        deletedAt: new Date()
      }
    });

    await tx.post.update({
      where: {
        id: comment.post.id
      },
      data: {
        commentCount: {
          decrement: targetIds.length
        }
      }
    });

    if (comment.parentId) {
      await tx.comment.update({
        where: {
          id: comment.parentId
        },
        data: {
          replyCount: {
            decrement: 1
          }
        }
      });
    }
  });

  return {
    ok: true,
    message: "评论已删除。"
  } as const;
}

export async function voteOnPoll(input: {
  postId: string;
  userId: string;
  optionIds: string[];
}) {
  const post = await prisma.post.findUnique({
    where: {
      id: input.postId
    },
    select: {
      id: true,
      deletedAt: true,
      status: true,
      poll: {
        select: {
          id: true,
          allowMultiple: true,
          expiresAt: true,
          options: {
            select: {
              id: true
            }
          }
        }
      }
    }
  });

  if (!post || post.deletedAt || post.status !== ContentStatus.PUBLISHED || !post.poll) {
    return {
      ok: false,
      message: "当前帖子没有可投票内容。"
    } as const;
  }

  if (post.poll.expiresAt && post.poll.expiresAt.getTime() <= Date.now()) {
    return {
      ok: false,
      message: "投票已经截止。"
    } as const;
  }

  const selectedOptionIds = Array.from(new Set(input.optionIds.filter(Boolean)));

  if (selectedOptionIds.length === 0) {
    return {
      ok: false,
      message: "请选择至少一个投票选项。"
    } as const;
  }

  if (!post.poll.allowMultiple && selectedOptionIds.length !== 1) {
    return {
      ok: false,
      message: "当前投票仅支持单选。"
    } as const;
  }

  const validOptionIds = new Set(post.poll.options.map((item) => item.id));

  if (selectedOptionIds.some((item) => !validOptionIds.has(item))) {
    return {
      ok: false,
      message: "存在无效投票选项。"
    } as const;
  }

  await prisma.$transaction(async (tx) => {
    const existingVotes = await tx.pollVote.findMany({
      where: {
        pollId: post.poll!.id,
        userId: input.userId
      },
      select: {
        id: true,
        optionId: true
      }
    });

    if (existingVotes.length > 0) {
      await tx.pollVote.deleteMany({
        where: {
          id: {
            in: existingVotes.map((item) => item.id)
          }
        }
      });

      await Promise.all(
        existingVotes.map((vote) =>
          tx.pollOption.update({
            where: {
              id: vote.optionId
            },
            data: {
              voteCount: {
                decrement: 1
              }
            }
          })
        )
      );
    }

    await Promise.all(
      selectedOptionIds.map((optionId) =>
        tx.pollVote.create({
          data: {
            pollId: post.poll!.id,
            optionId,
            userId: input.userId
          }
        })
      )
    );

    await Promise.all(
      selectedOptionIds.map((optionId) =>
        tx.pollOption.update({
          where: {
            id: optionId
          },
          data: {
            voteCount: {
              increment: 1
            }
          }
        })
      )
    );
  });

  return {
    ok: true,
    message: "投票已提交。"
  } as const;
}

export async function createPost(
  actor: {
    id: string;
    username: string;
    role: UserRole;
    settings?: { allowAnonymousPosts: boolean } | null;
    profile?: { nickname: string | null } | null;
  },
  input: {
    fields: Record<string, FormDataEntryValue | undefined>;
    attachments: File[];
  }
) {
  const parsed = postEditorSchema.safeParse(input.fields);

  if (!parsed.success) {
    return {
      ok: false,
      message: "请检查帖子内容后再提交。",
      fieldErrors: validationErrors(parsed.error)
    };
  }

  const postingContext = await getPostingCircleContext({
    circleId: parsed.data.circleId,
    actorId: actor.id,
    actorRole: actor.role
  });

  if (!postingContext) {
    return {
      ok: false,
      message: "未找到可发帖的圈子。"
    };
  }

  if (parsed.data.postType === "ANNOUNCEMENT" && !postingContext.canCreateAnnouncement) {
    return {
      ok: false,
      message: "只有圈主、圈管或超级管理员可以发布公告帖。",
      fieldErrors: {
        postType: "当前账号没有发布公告帖的权限"
      }
    };
  }

  if (parsed.data.isAnonymous && !postingContext.circle.allowAnonymous) {
    return {
      ok: false,
      message: "当前圈子未开启匿名发帖。",
      fieldErrors: {
        isAnonymous: "当前圈子未开启匿名发帖"
      }
    };
  }

  if (parsed.data.isAnonymous && actor.settings?.allowAnonymousPosts === false) {
    return {
      ok: false,
      message: "你的账号设置已关闭匿名发帖。",
      fieldErrors: {
        isAnonymous: "请先在账号设置中开启匿名发帖"
      }
    };
  }

  const attachmentValidationMessage = validateAttachmentFiles(input.attachments);

  if (attachmentValidationMessage) {
    return {
      ok: false,
      message: attachmentValidationMessage,
      fieldErrors: {
        attachments: attachmentValidationMessage
      }
    };
  }

  const globalTagNames = parseTagNames(parsed.data.globalTags);
  const circleTagNames = parseTagNames(parsed.data.circleTags);
  const contentPayload = buildContentPayload(parsed.data.content, parsed.data.mediaUrls);
  const mentionUsernames = extractMentionUsernames(parsed.data.content);
  const now = new Date();
  const rateLimit = await consumeRateLimit({
    key: `post:${actor.id}`,
    limit: 8,
    windowMs: 10 * 60 * 1000
  });

  if (!rateLimit.ok) {
    return {
      ok: false,
      message: "发帖过于频繁，请稍后再试。"
    };
  }

  const moderation = await getContentModerationDecision(prisma, {
    authorId: actor.id,
    contentType: "POST",
    text: `${parsed.data.title}\n${parsed.data.content}`,
    respectObservationPeriod: true
  });

  if (!moderation.ok) {
    return {
      ok: false,
      message: moderation.message,
      fieldErrors: {
        content: moderation.message
      }
    };
  }

  const initialHotScore =
    parsed.data.postType === "ANNOUNCEMENT"
      ? 2
      : parsed.data.postType === "EXPERIENCE"
        ? 1.5
        : parsed.data.postType === "POLL"
          ? 1.3
          : 1;

  return prisma.$transaction(async (tx) => {
    const createdPost = await tx.post.create({
      data: {
        circleId: postingContext.circle.id,
        authorId: actor.id,
        postType: parsed.data.postType as PostType,
        title: parsed.data.title,
        excerpt: contentPayload.excerpt,
        contentJson: contentPayload.contentJson,
        contentHtml: contentPayload.contentHtml,
        isAnonymous: parsed.data.isAnonymous,
        status: moderation.status,
        reviewNote: moderation.status === ContentStatus.PENDING_REVIEW ? moderation.reviewNote : null,
        publishedAt: moderation.status === ContentStatus.PUBLISHED ? now : null,
        scoreHot: initialHotScore
      },
      select: {
        id: true
      }
    });

    await syncPostTags(tx, {
      postId: createdPost.id,
      circleId: postingContext.circle.id,
      globalTagNames,
      circleTagNames
    });

    await syncPoll(tx, {
      postId: createdPost.id,
      postType: parsed.data.postType,
      pollQuestion: parsed.data.pollQuestion || parsed.data.title,
      pollOptions: parsed.data.pollOptions,
      allowMultiple: parsed.data.allowMultiple,
      resultVisibility: parsed.data.resultVisibility,
      expiresAt: parsed.data.expiresAt
    });

    await storePostAttachments(tx, {
      postId: createdPost.id,
      uploaderId: actor.id,
      files: input.attachments
    });

    if (moderation.status === ContentStatus.PUBLISHED) {
      await tx.circle.update({
        where: {
          id: postingContext.circle.id
        },
        data: {
          postsCount: {
            increment: 1
          }
        }
      });

      await awardPostCreatePoints(tx, {
        userId: actor.id,
        postId: createdPost.id,
        postTitle: parsed.data.title
      });
    }

    await tx.userProfile.updateMany({
      where: {
        userId: actor.id
      },
      data: {
        lastActiveAt: now
      }
    });

    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        action:
          moderation.status === ContentStatus.PUBLISHED ? "create_post" : "submit_post_for_review",
        entityType: "post",
        entityId: createdPost.id,
        payloadJson: {
          circleName: postingContext.circle.name,
          circleSlug: postingContext.circle.slug,
          postType: parsed.data.postType,
          title: parsed.data.title,
          isAnonymous: parsed.data.isAnonymous,
          moderationStatus: moderation.status,
          reviewNote: moderation.status === ContentStatus.PENDING_REVIEW ? moderation.reviewNote : null
        }
      }
    });

    if (moderation.status === ContentStatus.PENDING_REVIEW) {
      return {
        ok: true,
        message: moderation.message,
        postId: createdPost.id,
        circleSlug: postingContext.circle.slug,
        status: moderation.status
      } as const;
    }

    const mentionedUsers = (await findMentionedUsers(tx, mentionUsernames)).filter(
      (user) => user.id !== actor.id
    );

    await createNotifications(
      tx,
      mentionedUsers.map((user) => ({
        userId: user.id,
        type: NotificationType.MENTION,
        payload: {
          title: "你在帖子中被提到了",
          body: `${actor.profile?.nickname ?? actor.username} 在帖子《${parsed.data.title}》里提到了你。`,
          href: `/posts/${createdPost.id}`,
          actorUsername: actor.username,
          actorDisplayName: actor.profile?.nickname ?? actor.username
        }
      }))
    );

    return {
      ok: true,
      message: "帖子已发布。",
      postId: createdPost.id,
      circleSlug: postingContext.circle.slug,
      status: moderation.status
    } as const;
  });
}

export async function updatePost(
  actor: {
    id: string;
    username: string;
    role: UserRole;
    settings?: { allowAnonymousPosts: boolean } | null;
  },
  postId: string,
  input: {
    fields: Record<string, FormDataEntryValue | undefined>;
    attachments: File[];
    removeAttachmentIds: string[];
  }
) {
  const parsed = postEditorSchema.safeParse(input.fields);

  if (!parsed.success) {
    return {
      ok: false,
      message: "请检查帖子内容后再保存。",
      fieldErrors: validationErrors(parsed.error)
    };
  }

  const existingPost = await prisma.post.findUnique({
    where: {
      id: postId
    },
    select: {
      id: true,
      authorId: true,
      status: true,
      postType: true,
      title: true,
      contentJson: true,
      contentHtml: true,
      deletedAt: true,
      circleId: true,
      attachments: {
        select: {
          id: true
        }
      },
      circle: {
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          deletedAt: true,
          allowAnonymous: true,
          ownerId: true,
          managers: {
            where: {
              role: {
                in: [CircleManagerRole.OWNER, CircleManagerRole.MANAGER]
              }
            },
            select: {
              userId: true
            }
          }
        }
      }
    }
  });

  if (!existingPost || existingPost.deletedAt || existingPost.authorId !== actor.id) {
    return {
      ok: false,
      message: "你当前不能编辑这篇帖子。"
    };
  }

  if (
    existingPost.circle.status !== CircleStatus.ACTIVE ||
    existingPost.circle.deletedAt ||
    existingPost.circle.id !== parsed.data.circleId
  ) {
    return {
      ok: false,
      message: "帖子所属圈子状态异常，暂时无法编辑。"
    };
  }

  const canCreateAnnouncement =
    existingPost.postType === PostType.ANNOUNCEMENT ||
    canPublishAnnouncement({
      actorId: actor.id,
      actorRole: actor.role,
      ownerId: existingPost.circle.ownerId,
      managerUserIds: existingPost.circle.managers.map((item) => item.userId)
    });

  if (parsed.data.postType === "ANNOUNCEMENT" && !canCreateAnnouncement) {
    return {
      ok: false,
      message: "只有圈主、圈管或超级管理员可以发布公告帖。",
      fieldErrors: {
        postType: "当前账号没有发布公告帖的权限"
      }
    };
  }

  if (parsed.data.isAnonymous && !existingPost.circle.allowAnonymous) {
    return {
      ok: false,
      message: "当前圈子未开启匿名发帖。",
      fieldErrors: {
        isAnonymous: "当前圈子未开启匿名发帖"
      }
    };
  }

  if (parsed.data.isAnonymous && actor.settings?.allowAnonymousPosts === false) {
    return {
      ok: false,
      message: "你的账号设置已关闭匿名发帖。",
      fieldErrors: {
        isAnonymous: "请先在账号设置中开启匿名发帖"
      }
    };
  }

  const attachmentValidationMessage = validateAttachmentFiles(input.attachments);

  if (attachmentValidationMessage) {
    return {
      ok: false,
      message: attachmentValidationMessage,
      fieldErrors: {
        attachments: attachmentValidationMessage
      }
    };
  }

  const remainingAttachmentCount =
    existingPost.attachments.length -
    existingPost.attachments.filter((item) => input.removeAttachmentIds.includes(item.id)).length +
    input.attachments.filter((file) => file instanceof File && file.size > 0).length;

  if (remainingAttachmentCount > maxAttachmentCount) {
    return {
      ok: false,
      message: `单篇帖子最多保留 ${maxAttachmentCount} 个附件。`,
      fieldErrors: {
        attachments: `单篇帖子最多保留 ${maxAttachmentCount} 个附件`
      }
    };
  }

  const globalTagNames = parseTagNames(parsed.data.globalTags);
  const circleTagNames = parseTagNames(parsed.data.circleTags);
  const contentPayload = buildContentPayload(parsed.data.content, parsed.data.mediaUrls);
  const previousMentionUsernames = new Set(
    extractMentionUsernames(extractContentText(existingPost.contentJson)).map((username) =>
      username.toLowerCase()
    )
  );
  const newMentionUsernames = extractMentionUsernames(parsed.data.content);
  const moderation = await getContentModerationDecision(prisma, {
    authorId: actor.id,
    contentType: "POST",
    text: `${parsed.data.title}\n${parsed.data.content}`,
    respectObservationPeriod: existingPost.status !== ContentStatus.PUBLISHED
  });

  if (!moderation.ok) {
    return {
      ok: false,
      message: moderation.message,
      fieldErrors: {
        content: moderation.message
      }
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.postRevision.create({
      data: {
        postId: existingPost.id,
        editorId: actor.id,
        title: existingPost.title,
        contentJson: existingPost.contentJson as Prisma.InputJsonValue,
        contentHtml: existingPost.contentHtml
      }
    });

    const nextStatus =
      existingPost.status === ContentStatus.PUBLISHED &&
      moderation.status === ContentStatus.PUBLISHED
        ? ContentStatus.PUBLISHED
        : ContentStatus.PENDING_REVIEW;

    await tx.post.update({
      where: {
        id: existingPost.id
      },
      data: {
        postType: parsed.data.postType as PostType,
        title: parsed.data.title,
        excerpt: contentPayload.excerpt,
        contentJson: contentPayload.contentJson,
        contentHtml: contentPayload.contentHtml,
        isAnonymous: parsed.data.isAnonymous,
        status: nextStatus,
        reviewNote: nextStatus === ContentStatus.PENDING_REVIEW ? moderation.reviewNote : null,
        reviewedAt: nextStatus === ContentStatus.PENDING_REVIEW ? null : undefined,
        reviewedById: nextStatus === ContentStatus.PENDING_REVIEW ? null : undefined,
        publishedAt:
          nextStatus === ContentStatus.PENDING_REVIEW
            ? null
            : existingPost.deletedAt || existingPost.status !== ContentStatus.PUBLISHED
              ? new Date()
              : undefined
      }
    });

    if (existingPost.status === ContentStatus.PUBLISHED && nextStatus === ContentStatus.PENDING_REVIEW) {
      await tx.circle.update({
        where: {
          id: existingPost.circle.id
        },
        data: {
          postsCount: {
            decrement: 1
          }
        }
      });
    }

    await syncPostTags(tx, {
      postId: existingPost.id,
      circleId: existingPost.circle.id,
      globalTagNames,
      circleTagNames
    });

    await syncPoll(tx, {
      postId: existingPost.id,
      postType: parsed.data.postType,
      pollQuestion: parsed.data.pollQuestion || parsed.data.title,
      pollOptions: parsed.data.pollOptions,
      allowMultiple: parsed.data.allowMultiple,
      resultVisibility: parsed.data.resultVisibility,
      expiresAt: parsed.data.expiresAt
    });

    await removePostAttachments(tx, {
      postId: existingPost.id,
      attachmentIds: input.removeAttachmentIds
    });

    await storePostAttachments(tx, {
      postId: existingPost.id,
      uploaderId: actor.id,
      files: input.attachments
    });

    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        action: "update_post",
        entityType: "post",
        entityId: existingPost.id,
        payloadJson: {
          circleName: existingPost.circle.name,
          circleSlug: existingPost.circle.slug,
          postType: parsed.data.postType,
          title: parsed.data.title,
          moderationStatus: nextStatus,
          reviewNote: nextStatus === ContentStatus.PENDING_REVIEW ? moderation.reviewNote : null
        }
      }
    });

    if (nextStatus === ContentStatus.PENDING_REVIEW) {
      return;
    }

    const addedMentionUsernames = newMentionUsernames.filter(
      (username) => !previousMentionUsernames.has(username.toLowerCase())
    );
    const mentionedUsers = (await findMentionedUsers(tx, addedMentionUsernames)).filter(
      (user) => user.id !== actor.id
    );

    await createNotifications(
      tx,
      mentionedUsers.map((user) => ({
        userId: user.id,
        type: NotificationType.MENTION,
        payload: {
          title: "你在帖子中被提到了",
          body: `${actor.username} 在帖子《${parsed.data.title}》里提到了你。`,
          href: `/posts/${existingPost.id}`,
          actorUsername: actor.username,
          actorDisplayName: actor.username
        }
      }))
    );
  });

  return {
    ok: true,
    message:
      existingPost.status === ContentStatus.PUBLISHED &&
      moderation.status === ContentStatus.PUBLISHED
        ? "帖子已更新。"
        : moderation.message ?? "帖子已更新，内容重新进入审核。",
    postId: existingPost.id,
    circleSlug: existingPost.circle.slug,
    status:
      existingPost.status === ContentStatus.PUBLISHED &&
      moderation.status === ContentStatus.PUBLISHED
        ? ContentStatus.PUBLISHED
        : ContentStatus.PENDING_REVIEW
  };
}

export async function deletePost(input: {
  postId: string;
  actorId: string;
}) {
  const post = await prisma.post.findUnique({
    where: {
      id: input.postId
    },
    select: {
      id: true,
      authorId: true,
      title: true,
      status: true,
      deletedAt: true,
      circle: {
        select: {
          id: true,
          slug: true,
          name: true
        }
      }
    }
  });

  if (!post || post.authorId !== input.actorId) {
    return {
      ok: false,
      message: "你当前不能删除这篇帖子。"
    } as const;
  }

  if (post.deletedAt || post.status === ContentStatus.DELETED) {
    return {
      ok: true,
      message: "帖子已经删除。",
      redirectTo: `/circles/${post.circle.slug}?result=post-deleted`
    } as const;
  }

  await prisma.$transaction(async (tx) => {
    await tx.post.update({
      where: {
        id: post.id
      },
      data: {
        status: ContentStatus.DELETED,
        deletedAt: new Date()
      }
    });

    if (post.status === ContentStatus.PUBLISHED) {
      await tx.circle.update({
        where: {
          id: post.circle.id
        },
        data: {
          postsCount: {
            decrement: 1
          }
        }
      });
    }

    await tx.auditLog.create({
      data: {
        actorId: input.actorId,
        action: "delete_post",
        entityType: "post",
        entityId: post.id,
        payloadJson: {
          circleName: post.circle.name,
          circleSlug: post.circle.slug,
          title: post.title
        }
      }
    });
  });

  return {
    ok: true,
    message: "帖子已删除。",
    redirectTo: `/circles/${post.circle.slug}?result=post-deleted`
  } as const;
}
