import "server-only";

import {
  CircleManagerRole,
  CircleStatus,
  ContentStatus,
  HomeFeedChannel,
  PollResultVisibility,
  PostType,
  TagScope,
  type Prisma,
  type UserRole
} from "@/generated/prisma/client";
import { prisma } from "@/server/db/prisma";

import type {
  HomeFeedChannelValue,
  PollResultVisibilityValue,
  PostTypeValue,
  SquareSortValue
} from "@/modules/posts/lib/constants";
import { postEditorSchema } from "@/modules/posts/lib/validation";

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
  }
} satisfies Prisma.PostSelect;

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

function buildContentPayload(content: string) {
  const normalized = normalizeContent(content);
  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br />")}</p>`)
    .join("");

  return {
    contentJson: {
      type: "plain_text",
      text: normalized
    } satisfies Prisma.JsonObject,
    contentHtml: paragraphs,
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
          deletedAt: null,
          ...(input.channel === "FOLLOWING" && input.userId
            ? {
                follows: {
                  some: {
                    userId: input.userId
                  }
                }
              }
            : {})
        }
      }
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
      expiresAt: post.poll?.expiresAt
        ? new Date(post.poll.expiresAt.getTime() - post.poll.expiresAt.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16)
        : ""
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
  const post = await prisma.post.findUnique({
    where: {
      id: postId
    },
    select: postDetailSelect
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

  return {
    post,
    canEdit: Boolean(currentUserId && currentUserId === post.author.id),
    canRevealAuthor: currentUserRole === "SUPER_ADMIN"
  };
}

export async function createPost(
  actor: {
    id: string;
    username: string;
    role: UserRole;
    settings?: { allowAnonymousPosts: boolean } | null;
    profile?: { nickname: string | null } | null;
  },
  rawInput: Record<string, FormDataEntryValue | undefined>
) {
  const parsed = postEditorSchema.safeParse(rawInput);

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

  const globalTagNames = parseTagNames(parsed.data.globalTags);
  const circleTagNames = parseTagNames(parsed.data.circleTags);
  const contentPayload = buildContentPayload(parsed.data.content);
  const now = new Date();
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
        status: ContentStatus.PUBLISHED,
        publishedAt: now,
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
        action: "create_post",
        entityType: "post",
        entityId: createdPost.id,
        payloadJson: {
          circleName: postingContext.circle.name,
          circleSlug: postingContext.circle.slug,
          postType: parsed.data.postType,
          title: parsed.data.title,
          isAnonymous: parsed.data.isAnonymous
        }
      }
    });

    return {
      ok: true,
      message: "帖子已发布。",
      postId: createdPost.id,
      circleSlug: postingContext.circle.slug
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
  rawInput: Record<string, FormDataEntryValue | undefined>
) {
  const parsed = postEditorSchema.safeParse(rawInput);

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
      postType: true,
      title: true,
      contentJson: true,
      contentHtml: true,
      deletedAt: true,
      circleId: true,
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

  const globalTagNames = parseTagNames(parsed.data.globalTags);
  const circleTagNames = parseTagNames(parsed.data.circleTags);
  const contentPayload = buildContentPayload(parsed.data.content);

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
        status: ContentStatus.PUBLISHED,
        publishedAt: existingPost.deletedAt ? new Date() : undefined
      }
    });

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
          title: parsed.data.title
        }
      }
    });
  });

  return {
    ok: true,
    message: "帖子已更新。",
    postId: existingPost.id,
    circleSlug: existingPost.circle.slug
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
