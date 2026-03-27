import "server-only";

import {
  ContentStatus,
  ModerationActionType,
  NotificationType,
  ReportStatus,
  ReportTargetType,
  SensitiveWordAction,
  UserStatus,
  type Prisma,
  type ReportType
} from "@/generated/prisma/client";
import { createNotification } from "@/modules/notifications/lib/service";
import {
  awardCommentCreatePoints,
  awardPostCreatePoints
} from "@/modules/growth/lib/service";
import {
  contentReviewThreshold,
  type UserRestrictionValue
} from "@/modules/moderation/lib/constants";
import {
  moderationReviewSchema,
  reportResolutionSchema,
  reportSubmissionSchema,
  userRestrictionSchema
} from "@/modules/moderation/lib/validation";
import {
  extractMentionUsernames,
  findMentionedUsers
} from "@/modules/notifications/lib/mentions";
import { prisma } from "@/server/db/prisma";

type TransactionClient = Prisma.TransactionClient;

function validationErrors(error: unknown) {
  if (!(error instanceof Error) || !("issues" in error)) {
    return undefined;
  }

  const issues = (error as { issues: Array<{ path: PropertyKey[]; message: string }> }).issues;

  return Object.fromEntries(
    issues.map((issue) => [String(issue.path[0] ?? "form"), issue.message])
  ) as Record<string, string>;
}

function normalizePageNumber(value: number | undefined) {
  if (!value || !Number.isFinite(value)) {
    return 1;
  }

  return Math.max(1, Math.floor(value));
}

function normalizePageTake(value: number | undefined, fallback: number, max: number) {
  if (!value || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(1, Math.min(max, Math.floor(value)));
}

function parseDateInput(value: string | undefined, boundary: "start" | "end") {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return undefined;
  }

  const date = new Date(
    `${value}T${boundary === "start" ? "00:00:00.000" : "23:59:59.999"}`
  );

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date;
}

function buildCreatedAtFilter(createdFrom?: string, createdTo?: string) {
  const gte = parseDateInput(createdFrom, "start");
  const lte = parseDateInput(createdTo, "end");

  if (!gte && !lte) {
    return undefined;
  }

  return {
    ...(gte ? { gte } : {}),
    ...(lte ? { lte } : {})
  } satisfies Prisma.DateTimeFilter;
}

function buildSearchContains(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  return trimmed;
}

function toDisplayName(user: {
  username: string;
  profile?: {
    nickname?: string | null;
  } | null;
}) {
  return user.profile?.nickname ?? user.username;
}

function excerptFromHtml(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
}

function extractContentText(value: Prisma.JsonValue) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return "";
  }

  const text = (value as { text?: unknown }).text;

  return typeof text === "string" ? text : "";
}

function getMatchedWordsLabel(words: string[]) {
  return words.slice(0, 5).join("、");
}

function buildContentReviewNote(input: {
  needsNewUserReview: boolean;
  suspectWords: string[];
  fallback: string;
}) {
  const reasons: string[] = [];

  if (input.needsNewUserReview) {
    reasons.push("新用户观察期内容");
  }

  if (input.suspectWords.length > 0) {
    reasons.push(`命中疑似风险词：${getMatchedWordsLabel(input.suspectWords)}`);
  }

  return reasons.length > 0 ? `自动送审：${reasons.join("；")}` : input.fallback;
}

async function getActiveSensitiveWords(client: TransactionClient | typeof prisma) {
  return client.sensitiveWord.findMany({
    where: {
      isActive: true
    },
    orderBy: [{ createdAt: "asc" }],
    select: {
      word: true,
      level: true,
      action: true
    }
  });
}

async function analyzeSensitiveWords(
  client: TransactionClient | typeof prisma,
  text: string
) {
  const normalized = text.trim().toLowerCase();

  if (!normalized) {
    return {
      severeWords: [] as string[],
      suspectWords: [] as string[],
      generalWords: [] as string[]
    };
  }

  const words = await getActiveSensitiveWords(client);
  const result = {
    severeWords: [] as string[],
    suspectWords: [] as string[],
    generalWords: [] as string[]
  };

  for (const item of words) {
    if (!normalized.includes(item.word.toLowerCase())) {
      continue;
    }

    if (item.action === SensitiveWordAction.BLOCK) {
      result.severeWords.push(item.word);
      continue;
    }

    if (item.action === SensitiveWordAction.REVIEW) {
      result.suspectWords.push(item.word);
      continue;
    }

    result.generalWords.push(item.word);
  }

  return result;
}

async function countUserCreatedContent(
  client: TransactionClient | typeof prisma,
  input: {
    authorId: string;
    contentType: "POST" | "COMMENT";
  }
) {
  if (input.contentType === "POST") {
    return client.post.count({
      where: {
        authorId: input.authorId,
        status: {
          in: [ContentStatus.PUBLISHED, ContentStatus.PENDING_REVIEW, ContentStatus.REJECTED]
        },
        deletedAt: null
      }
    });
  }

  return client.comment.count({
    where: {
      authorId: input.authorId,
      status: {
        in: [ContentStatus.PUBLISHED, ContentStatus.PENDING_REVIEW, ContentStatus.REJECTED]
      },
      deletedAt: null
    }
  });
}

export async function getContentModerationDecision(
  client: TransactionClient | typeof prisma,
  input: {
    authorId: string;
    contentType: "POST" | "COMMENT";
    text: string;
    respectObservationPeriod: boolean;
  }
) {
  const sensitive = await analyzeSensitiveWords(client, input.text);

  if (sensitive.severeWords.length > 0) {
    return {
      ok: false,
      message: `内容命中严重敏感词，已被拦截：${getMatchedWordsLabel(sensitive.severeWords)}。`
    } as const;
  }

  if (sensitive.generalWords.length > 0) {
    return {
      ok: false,
      message: `内容里包含需要修改的风险词：${getMatchedWordsLabel(sensitive.generalWords)}。请调整后再提交。`
    } as const;
  }

  let needsNewUserReview = false;

  if (input.respectObservationPeriod) {
    const createdCount = await countUserCreatedContent(client, input);
    const threshold =
      input.contentType === "POST"
        ? contentReviewThreshold.postCount
        : contentReviewThreshold.commentCount;

    needsNewUserReview = createdCount < threshold;
  }

  const needsSensitiveReview = sensitive.suspectWords.length > 0;
  const needsReview = needsNewUserReview || needsSensitiveReview;

  return {
    ok: true,
    status: needsReview ? ContentStatus.PENDING_REVIEW : ContentStatus.PUBLISHED,
    needsNewUserReview,
    suspectWords: sensitive.suspectWords,
    reviewNote: buildContentReviewNote({
      needsNewUserReview,
      suspectWords: sensitive.suspectWords,
      fallback: "自动送审：内容进入审核队列。"
    }),
    message: needsReview
      ? needsSensitiveReview
        ? "内容命中疑似风险词，已进入审核队列。"
        : "你的账号仍在观察期，这条内容已进入审核队列。"
      : null
  } as const;
}

const adminPendingPostSelect = {
  id: true,
  title: true,
  excerpt: true,
  contentHtml: true,
  reviewNote: true,
  isAnonymous: true,
  createdAt: true,
  updatedAt: true,
  circle: {
    select: {
      id: true,
      name: true,
      slug: true
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
  }
} satisfies Prisma.PostSelect;

const adminPendingCommentSelect = {
  id: true,
  postId: true,
  parentId: true,
  rootId: true,
  contentHtml: true,
  reviewNote: true,
  isAnonymous: true,
  createdAt: true,
  updatedAt: true,
  post: {
    select: {
      id: true,
      title: true,
      circle: {
        select: {
          id: true,
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
  }
} satisfies Prisma.CommentSelect;

export type AdminPendingPostItem = Prisma.PostGetPayload<{
  select: typeof adminPendingPostSelect;
}>;

export type AdminPendingCommentItem = Prisma.CommentGetPayload<{
  select: typeof adminPendingCommentSelect;
}>;

async function paginatePendingPosts(args: {
  where: Prisma.PostWhereInput;
  page?: number;
  take?: number;
}) {
  const pageSize = normalizePageTake(args.take, 10, 30);
  const totalCount = await prisma.post.count({
    where: args.where
  });
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const page = Math.min(normalizePageNumber(args.page), totalPages);
  const items = await prisma.post.findMany({
    where: args.where,
    select: adminPendingPostSelect,
    orderBy: [{ createdAt: "asc" }],
    skip: (page - 1) * pageSize,
    take: pageSize
  });

  return {
    items,
    totalCount,
    totalPages,
    page,
    pageSize
  };
}

async function paginatePendingComments(args: {
  where: Prisma.CommentWhereInput;
  page?: number;
  take?: number;
}) {
  const pageSize = normalizePageTake(args.take, 12, 36);
  const totalCount = await prisma.comment.count({
    where: args.where
  });
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const page = Math.min(normalizePageNumber(args.page), totalPages);
  const items = await prisma.comment.findMany({
    where: args.where,
    select: adminPendingCommentSelect,
    orderBy: [{ createdAt: "asc" }],
    skip: (page - 1) * pageSize,
    take: pageSize
  });

  return {
    items,
    totalCount,
    totalPages,
    page,
    pageSize
  };
}

export async function getModerationDashboardSummary() {
  const [pendingPostCount, pendingCommentCount, pendingReportCount, mutedUserCount, bannedUserCount] =
    await Promise.all([
      prisma.post.count({
        where: {
          status: ContentStatus.PENDING_REVIEW,
          deletedAt: null
        }
      }),
      prisma.comment.count({
        where: {
          status: ContentStatus.PENDING_REVIEW,
          deletedAt: null
        }
      }),
      prisma.report.count({
        where: {
          status: ReportStatus.PENDING
        }
      }),
      prisma.user.count({
        where: {
          status: UserStatus.MUTED
        }
      }),
      prisma.user.count({
        where: {
          status: UserStatus.BANNED
        }
      })
    ]);

  return {
    pendingPostCount,
    pendingCommentCount,
    pendingReportCount,
    mutedUserCount,
    bannedUserCount
  };
}

export async function listPendingPostsForAdmin(filters?: {
  query?: string;
  createdFrom?: string;
  createdTo?: string;
  page?: number;
  take?: number;
}) {
  const search = buildSearchContains(filters?.query ?? "");
  const createdAt = buildCreatedAtFilter(filters?.createdFrom, filters?.createdTo);

  return paginatePendingPosts({
    where: {
      status: ContentStatus.PENDING_REVIEW,
      deletedAt: null,
      ...(createdAt ? { createdAt } : {}),
      ...(search
        ? {
            OR: [
              {
                title: {
                  contains: search,
                  mode: "insensitive"
                }
              },
              {
                excerpt: {
                  contains: search,
                  mode: "insensitive"
                }
              },
              {
                author: {
                  is: {
                    OR: [
                      {
                        username: {
                          contains: search,
                          mode: "insensitive"
                        }
                      },
                      {
                        profile: {
                          is: {
                            nickname: {
                              contains: search,
                              mode: "insensitive"
                            }
                          }
                        }
                      }
                    ]
                  }
                }
              },
              {
                circle: {
                  is: {
                    name: {
                      contains: search,
                      mode: "insensitive"
                    }
                  }
                }
              }
            ]
          }
        : {})
    },
    page: filters?.page,
    take: filters?.take
  });
}

export async function listPendingCommentsForAdmin(filters?: {
  query?: string;
  createdFrom?: string;
  createdTo?: string;
  page?: number;
  take?: number;
}) {
  const search = buildSearchContains(filters?.query ?? "");
  const createdAt = buildCreatedAtFilter(filters?.createdFrom, filters?.createdTo);

  return paginatePendingComments({
    where: {
      status: ContentStatus.PENDING_REVIEW,
      deletedAt: null,
      ...(createdAt ? { createdAt } : {}),
      ...(search
        ? {
            OR: [
              {
                contentHtml: {
                  contains: search,
                  mode: "insensitive"
                }
              },
              {
                author: {
                  is: {
                    OR: [
                      {
                        username: {
                          contains: search,
                          mode: "insensitive"
                        }
                      },
                      {
                        profile: {
                          is: {
                            nickname: {
                              contains: search,
                              mode: "insensitive"
                            }
                          }
                        }
                      }
                    ]
                  }
                }
              },
              {
                post: {
                  is: {
                    title: {
                      contains: search,
                      mode: "insensitive"
                    }
                  }
                }
              }
            ]
          }
        : {})
    },
    page: filters?.page,
    take: filters?.take
  });
}

async function notifyContentReviewResult(
  tx: TransactionClient,
  input: {
    userId: string;
    title: string;
    body: string;
    href: string;
  }
) {
  await createNotification(tx, {
    userId: input.userId,
    type: NotificationType.CONTENT_REVIEW,
    payload: {
      title: input.title,
      body: input.body,
      href: input.href
    }
  });
}

async function applyCommentApprovalSideEffects(
  tx: TransactionClient,
  input: {
    commentId: string;
    postId: string;
    parentId: string | null;
    actor: {
      id: string;
      username: string;
      profile?: {
        nickname: string | null;
      } | null;
    };
    commentContentHtml: string;
  }
) {
  await tx.post.update({
    where: {
      id: input.postId
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

  if (input.parentId) {
    await tx.comment.update({
      where: {
        id: input.parentId
      },
      data: {
        replyCount: {
          increment: 1
        }
      }
    });
  }

  const post = await tx.post.findUnique({
    where: {
      id: input.postId
    },
    select: {
      id: true,
      title: true,
      authorId: true
    }
  });

  if (!post) {
    return;
  }

  if (input.parentId) {
    const parentComment = await tx.comment.findUnique({
      where: {
        id: input.parentId
      },
      select: {
        id: true,
        authorId: true
      }
    });

    if (parentComment && parentComment.authorId !== input.actor.id) {
      await createNotification(tx, {
        userId: parentComment.authorId,
        type: NotificationType.REPLY,
        payload: {
          title: "你收到了一条回复",
          body: `${toDisplayName(input.actor)} 回复了你在《${post.title}》下的评论。`,
          href: `/posts/${post.id}#comment-${input.commentId}`,
          actorUsername: input.actor.username,
          actorDisplayName: toDisplayName(input.actor)
        }
      });
    }
  } else if (post.authorId !== input.actor.id) {
    await createNotification(tx, {
      userId: post.authorId,
      type: NotificationType.COMMENT,
      payload: {
        title: "你的帖子收到新评论",
        body: `${toDisplayName(input.actor)} 评论了你的帖子《${post.title}》。`,
        href: `/posts/${post.id}#comment-${input.commentId}`,
        actorUsername: input.actor.username,
        actorDisplayName: toDisplayName(input.actor)
      }
    });
  }
}

export async function reviewPendingPost(
  adminId: string,
  input: {
    postId: string;
    decision: "APPROVE" | "REJECT";
    reviewNote?: string;
  }
) {
  const parsed = moderationReviewSchema.safeParse({
    reviewNote: input.reviewNote ?? ""
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "请检查审核说明后再提交。",
      fieldErrors: validationErrors(parsed.error)
    };
  }

  const normalizedNote = parsed.data.reviewNote || "";

  if (input.decision === "REJECT" && !normalizedNote) {
    return {
      ok: false,
      message: "拒绝帖子时请填写审核说明。",
      fieldErrors: {
        reviewNote: "拒绝时请填写审核原因"
      }
    };
  }

  return prisma.$transaction(async (tx) => {
    const post = await tx.post.findUnique({
      where: {
        id: input.postId
      },
      select: {
        id: true,
        title: true,
        contentJson: true,
        status: true,
        authorId: true,
        deletedAt: true,
        circle: {
          select: {
            id: true,
            slug: true,
            name: true
          }
        },
        author: {
          select: {
            username: true,
            profile: {
              select: {
                nickname: true
              }
            }
          }
        }
      }
    });

    if (!post || post.deletedAt) {
      return {
        ok: false,
        message: "未找到对应的待审帖子。"
      } as const;
    }

    if (post.status !== ContentStatus.PENDING_REVIEW) {
      return {
        ok: false,
        message: "该帖子已经被处理，请刷新后重试。"
      } as const;
    }

    const reviewedAt = new Date();
    const nextStatus =
      input.decision === "APPROVE" ? ContentStatus.PUBLISHED : ContentStatus.REJECTED;

    await tx.post.update({
      where: {
        id: post.id
      },
      data: {
        status: nextStatus,
        reviewNote: normalizedNote || null,
        reviewedAt,
        reviewedById: adminId,
        publishedAt: input.decision === "APPROVE" ? reviewedAt : null
      }
    });

    if (input.decision === "APPROVE") {
      await tx.circle.update({
        where: {
          id: post.circle.id
        },
        data: {
          postsCount: {
            increment: 1
          }
        }
      });

      await awardPostCreatePoints(tx, {
        userId: post.authorId,
        postId: post.id,
        postTitle: post.title
      });

      const mentionUsernames = extractMentionUsernames(extractContentText(post.contentJson));
      const mentionedUsers = (await findMentionedUsers(tx, mentionUsernames)).filter(
        (user) => user.id !== post.authorId
      );

      for (const user of mentionedUsers) {
        await createNotification(tx, {
          userId: user.id,
          type: NotificationType.MENTION,
          payload: {
            title: "你在帖子中被提到了",
            body: `${toDisplayName(post.author)} 在帖子《${post.title}》里提到了你。`,
            href: `/posts/${post.id}`,
            actorUsername: post.author.username,
            actorDisplayName: toDisplayName(post.author)
          }
        });
      }
    }

    await tx.moderationAction.create({
      data: {
        actorId: adminId,
        targetUserId: post.authorId,
        actionType:
          input.decision === "APPROVE"
            ? ModerationActionType.APPROVE_CONTENT
            : ModerationActionType.REJECT_CONTENT,
        targetType: ReportTargetType.POST,
        targetId: post.id,
        reason: normalizedNote || null,
        metadataJson: {
          contentType: "post",
          title: post.title,
          decision: input.decision,
          reviewedAt: reviewedAt.toISOString()
        }
      }
    });

    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: input.decision === "APPROVE" ? "approve_post_review" : "reject_post_review",
        entityType: "post",
        entityId: post.id,
        payloadJson: {
          title: post.title,
          circleName: post.circle.name,
          circleSlug: post.circle.slug,
          decision: input.decision,
          reviewNote: normalizedNote || null
        }
      }
    });

    await notifyContentReviewResult(tx, {
      userId: post.authorId,
      title: input.decision === "APPROVE" ? "你的帖子已通过审核" : "你的帖子未通过审核",
      body:
        input.decision === "APPROVE"
          ? `帖子《${post.title}》已经上线。`
          : `帖子《${post.title}》未通过审核：${normalizedNote}`,
      href:
        input.decision === "APPROVE"
          ? `/posts/${post.id}`
          : `/circles/${post.circle.slug}?result=error&message=${encodeURIComponent("帖子未通过审核")}`
    });

    return {
      ok: true,
      message:
        input.decision === "APPROVE"
          ? `已通过帖子《${post.title}》的审核。`
          : `已拒绝帖子《${post.title}》并通知作者。`
    } as const;
  });
}

export async function reviewPendingComment(
  adminId: string,
  input: {
    commentId: string;
    decision: "APPROVE" | "REJECT";
    reviewNote?: string;
  }
) {
  const parsed = moderationReviewSchema.safeParse({
    reviewNote: input.reviewNote ?? ""
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "请检查审核说明后再提交。",
      fieldErrors: validationErrors(parsed.error)
    };
  }

  const normalizedNote = parsed.data.reviewNote || "";

  if (input.decision === "REJECT" && !normalizedNote) {
    return {
      ok: false,
      message: "拒绝评论时请填写审核说明。",
      fieldErrors: {
        reviewNote: "拒绝时请填写审核原因"
      }
    };
  }

  return prisma.$transaction(async (tx) => {
    const comment = await tx.comment.findUnique({
      where: {
        id: input.commentId
      },
      select: {
        id: true,
        postId: true,
        parentId: true,
        status: true,
        deletedAt: true,
        authorId: true,
        contentJson: true,
        contentHtml: true,
        post: {
          select: {
            title: true,
            circle: {
              select: {
                slug: true,
                name: true
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
        }
      }
    });

    if (!comment || comment.deletedAt) {
      return {
        ok: false,
        message: "未找到对应的待审评论。"
      } as const;
    }

    if (comment.status !== ContentStatus.PENDING_REVIEW) {
      return {
        ok: false,
        message: "该评论已经被处理，请刷新后重试。"
      } as const;
    }

    const reviewedAt = new Date();
    const nextStatus =
      input.decision === "APPROVE" ? ContentStatus.PUBLISHED : ContentStatus.REJECTED;

    await tx.comment.update({
      where: {
        id: comment.id
      },
      data: {
        status: nextStatus,
        reviewNote: normalizedNote || null,
        reviewedAt,
        reviewedById: adminId
      }
    });

    if (input.decision === "APPROVE") {
      await applyCommentApprovalSideEffects(tx, {
        commentId: comment.id,
        postId: comment.postId,
        parentId: comment.parentId,
        actor: comment.author,
        commentContentHtml: comment.contentHtml
      });

      await awardCommentCreatePoints(tx, {
        userId: comment.authorId,
        commentId: comment.id,
        postId: comment.postId,
        postTitle: comment.post.title
      });

      const mentionUsernames = extractMentionUsernames(extractContentText(comment.contentJson));
      const mentionedUsers = (await findMentionedUsers(tx, mentionUsernames)).filter(
        (user) => user.id !== comment.authorId
      );

      for (const user of mentionedUsers) {
        await createNotification(tx, {
          userId: user.id,
          type: NotificationType.MENTION,
          payload: {
            title: "你在评论中被提到了",
            body: `${toDisplayName(comment.author)} 在《${comment.post.title}》的评论里提到了你。`,
            href: `/posts/${comment.postId}#comment-${comment.id}`,
            actorUsername: comment.author.username,
            actorDisplayName: toDisplayName(comment.author)
          }
        });
      }
    }

    await tx.moderationAction.create({
      data: {
        actorId: adminId,
        targetUserId: comment.authorId,
        actionType:
          input.decision === "APPROVE"
            ? ModerationActionType.APPROVE_CONTENT
            : ModerationActionType.REJECT_CONTENT,
        targetType: ReportTargetType.COMMENT,
        targetId: comment.id,
        reason: normalizedNote || null,
        metadataJson: {
          contentType: "comment",
          postId: comment.postId,
          postTitle: comment.post.title,
          decision: input.decision,
          reviewedAt: reviewedAt.toISOString()
        }
      }
    });

    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action:
          input.decision === "APPROVE" ? "approve_comment_review" : "reject_comment_review",
        entityType: "comment",
        entityId: comment.id,
        payloadJson: {
          postId: comment.postId,
          postTitle: comment.post.title,
          circleName: comment.post.circle.name,
          circleSlug: comment.post.circle.slug,
          decision: input.decision,
          reviewNote: normalizedNote || null
        }
      }
    });

    await notifyContentReviewResult(tx, {
      userId: comment.authorId,
      title: input.decision === "APPROVE" ? "你的评论已通过审核" : "你的评论未通过审核",
      body:
        input.decision === "APPROVE"
          ? `你在《${comment.post.title}》下的评论已经发布。`
          : `你在《${comment.post.title}》下的评论未通过审核：${normalizedNote}`,
      href: `/posts/${comment.postId}#comments`
    });

    return {
      ok: true,
      message:
        input.decision === "APPROVE"
          ? "已通过评论审核。"
          : "已拒绝评论并通知作者。"
    } as const;
  });
}

async function resolveReportTarget(
  tx: TransactionClient | typeof prisma,
  input: {
    targetType: ReportTargetType;
    targetId: string;
  }
) {
  if (input.targetType === ReportTargetType.POST) {
    const post = await tx.post.findUnique({
      where: {
        id: input.targetId
      },
      select: {
        id: true,
        title: true,
        status: true,
        deletedAt: true,
        authorId: true,
        circle: {
          select: {
            id: true,
            slug: true,
            name: true
          }
        }
      }
    });

    if (!post || post.deletedAt) {
      return null;
    }

    return {
      label: `帖子《${post.title}》`,
      ownerUserId: post.authorId,
      href: `/posts/${post.id}`,
      entity: post
    };
  }

  if (input.targetType === ReportTargetType.COMMENT) {
    const comment = await tx.comment.findUnique({
      where: {
        id: input.targetId
      },
      select: {
        id: true,
        postId: true,
        parentId: true,
        status: true,
        deletedAt: true,
        authorId: true,
        post: {
          select: {
            title: true,
            circle: {
              select: {
                slug: true,
                name: true
              }
            }
          }
        }
      }
    });

    if (!comment || comment.deletedAt) {
      return null;
    }

    return {
      label: `评论（《${comment.post.title}》）`,
      ownerUserId: comment.authorId,
      href: `/posts/${comment.postId}#comment-${comment.id}`,
      entity: comment
    };
  }

  if (input.targetType === ReportTargetType.USER) {
    const user = await tx.user.findUnique({
      where: {
        id: input.targetId
      },
      select: {
        id: true,
        username: true,
        status: true
      }
    });

    if (!user) {
      return null;
    }

    return {
      label: `用户 @${user.username}`,
      ownerUserId: user.id,
      href: `/users/${user.username}`,
      entity: user
    };
  }

  if (input.targetType === ReportTargetType.CIRCLE) {
    const circle = await tx.circle.findUnique({
      where: {
        id: input.targetId
      },
      select: {
        id: true,
        slug: true,
        name: true,
        ownerId: true,
        deletedAt: true
      }
    });

    if (!circle || circle.deletedAt) {
      return null;
    }

    return {
      label: `圈子 ${circle.name}`,
      ownerUserId: circle.ownerId,
      href: `/circles/${circle.slug}`,
      entity: circle
    };
  }

  const message = await tx.message.findUnique({
    where: {
      id: input.targetId
    },
    select: {
      id: true,
      senderId: true,
      conversationId: true,
      isDeleted: true
    }
  });

  if (!message || message.isDeleted) {
    return null;
  }

  return {
    label: "私信消息",
    ownerUserId: message.senderId,
    href: `/me/messages/${message.conversationId}`,
    entity: message
  };
}

export async function submitReport(
  reporterId: string,
  rawInput: Record<string, FormDataEntryValue | undefined>
) {
  const parsed = reportSubmissionSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      ok: false,
      message: "请检查举报信息后再提交。",
      fieldErrors: validationErrors(parsed.error)
    };
  }

  return prisma.$transaction(async (tx) => {
    const target = await resolveReportTarget(tx, {
      targetType: parsed.data.targetType,
      targetId: parsed.data.targetId
    });

    if (!target) {
      return {
        ok: false,
        message: "举报目标不存在，或内容已经被移除。"
      } as const;
    }

    if (target.ownerUserId && target.ownerUserId === reporterId) {
      return {
        ok: false,
        message: "不能举报自己发布的内容。"
      } as const;
    }

    const existingReport = await tx.report.findFirst({
      where: {
        reporterId,
        targetType: parsed.data.targetType,
        targetId: parsed.data.targetId,
        status: {
          in: [ReportStatus.PENDING, ReportStatus.PROCESSING]
        }
      },
      select: {
        id: true
      }
    });

    if (existingReport) {
      return {
        ok: true,
        message: "你已经提交过同一目标的举报，我们会继续处理。"
      } as const;
    }

    const report = await tx.report.create({
      data: {
        reporterId,
        targetType: parsed.data.targetType,
        targetId: parsed.data.targetId,
        reportType: parsed.data.reportType as ReportType,
        detail: parsed.data.detail || null,
        status: ReportStatus.PENDING
      },
      select: {
        id: true
      }
    });

    await tx.auditLog.create({
      data: {
        actorId: reporterId,
        action: "submit_report",
        entityType: "report",
        entityId: report.id,
        payloadJson: {
          targetType: parsed.data.targetType,
          targetId: parsed.data.targetId,
          targetLabel: target.label,
          reportType: parsed.data.reportType,
          detail: parsed.data.detail || null
        }
      }
    });

    return {
      ok: true,
      message: "举报已提交，管理员会尽快处理。"
    } as const;
  });
}

const adminReportSelect = {
  id: true,
  targetType: true,
  targetId: true,
  reportType: true,
  detail: true,
  status: true,
  resolutionNote: true,
  createdAt: true,
  resolvedAt: true,
  reporter: {
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
  assignee: {
    select: {
      username: true,
      profile: {
        select: {
          nickname: true
        }
      }
    }
  },
  resolver: {
    select: {
      username: true,
      profile: {
        select: {
          nickname: true
        }
      }
    }
  }
} satisfies Prisma.ReportSelect;

export type AdminReportItem = Prisma.ReportGetPayload<{
  select: typeof adminReportSelect;
}> & {
  targetLabel: string;
  targetHref: string | null;
};

export async function listReportsForAdmin(filters?: {
  query?: string;
  status?: ReportStatus;
  targetType?: ReportTargetType;
  page?: number;
  take?: number;
}) {
  const search = buildSearchContains(filters?.query ?? "");
  const pageSize = normalizePageTake(filters?.take, 12, 40);
  const where = {
    ...(filters?.status ? { status: filters.status } : {}),
    ...(filters?.targetType ? { targetType: filters.targetType } : {}),
    ...(search
      ? {
          OR: [
            {
              detail: {
                contains: search,
                mode: "insensitive"
              }
            },
            {
              reporter: {
                is: {
                  OR: [
                    {
                      username: {
                        contains: search,
                        mode: "insensitive"
                      }
                    },
                    {
                      profile: {
                        is: {
                          nickname: {
                            contains: search,
                            mode: "insensitive"
                          }
                        }
                      }
                    }
                  ]
                }
              }
            }
          ]
        }
      : {})
  } satisfies Prisma.ReportWhereInput;
  const totalCount = await prisma.report.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const page = Math.min(normalizePageNumber(filters?.page), totalPages);
  const reports = await prisma.report.findMany({
    where,
    select: adminReportSelect,
    orderBy: [
      { status: "asc" },
      { createdAt: "desc" }
    ],
    skip: (page - 1) * pageSize,
    take: pageSize
  });

  const items = await Promise.all(
    reports.map(async (report) => {
      const target = await resolveReportTarget(prisma, {
        targetType: report.targetType,
        targetId: report.targetId
      });

      return {
        ...report,
        targetLabel: target?.label ?? "目标已不存在",
        targetHref: target?.href ?? null
      };
    })
  );

  return {
    items,
    totalCount,
    totalPages,
    page,
    pageSize
  };
}

async function deletePostByModeration(
  tx: TransactionClient,
  input: {
    postId: string;
    actorId: string;
    reason: string | null;
  }
) {
  const post = await tx.post.findUnique({
    where: {
      id: input.postId
    },
    select: {
      id: true,
      title: true,
      status: true,
      deletedAt: true,
      authorId: true,
      circle: {
        select: {
          id: true,
          slug: true,
          name: true
        }
      }
    }
  });

  if (!post || post.deletedAt) {
    return null;
  }

  if (post.status !== ContentStatus.DELETED) {
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
  }

  await tx.moderationAction.create({
    data: {
      actorId: input.actorId,
      targetUserId: post.authorId,
      actionType: ModerationActionType.DELETE_POST,
      targetType: ReportTargetType.POST,
      targetId: post.id,
      reason: input.reason,
      metadataJson: {
        title: post.title,
        circleName: post.circle.name,
        circleSlug: post.circle.slug
      }
    }
  });

  await tx.auditLog.create({
    data: {
      actorId: input.actorId,
      action: "delete_post_by_report",
      entityType: "post",
      entityId: post.id,
      payloadJson: {
        title: post.title,
        circleName: post.circle.name,
        circleSlug: post.circle.slug,
        reason: input.reason
      }
    }
  });

  await createNotification(tx, {
    userId: post.authorId,
    type: NotificationType.CONTENT_REVIEW,
    payload: {
      title: "你的帖子已被管理员移除",
      body: input.reason
        ? `帖子《${post.title}》已被移除，原因：${input.reason}`
        : `帖子《${post.title}》已被管理员移除。`,
      href: `/circles/${post.circle.slug}`
    }
  });

  return post;
}

async function deleteCommentByModeration(
  tx: TransactionClient,
  input: {
    commentId: string;
    actorId: string;
    reason: string | null;
  }
) {
  const comment = await tx.comment.findUnique({
    where: {
      id: input.commentId
    },
    select: {
      id: true,
      postId: true,
      parentId: true,
      rootId: true,
      status: true,
      deletedAt: true,
      authorId: true,
      post: {
        select: {
          title: true
        }
      }
    }
  });

  if (!comment || comment.deletedAt) {
    return null;
  }

  if (comment.status !== ContentStatus.DELETED) {
    const descendantReplies = comment.parentId
      ? []
      : await tx.comment.findMany({
          where: {
            rootId: comment.id,
            deletedAt: null
          },
          select: {
            id: true,
            status: true
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

    if (comment.status === ContentStatus.PUBLISHED) {
      const publishedReplyCount = descendantReplies.filter(
        (item) => item.status === ContentStatus.PUBLISHED
      ).length;

      await tx.post.update({
        where: {
          id: comment.postId
        },
        data: {
          commentCount: {
            decrement: 1 + publishedReplyCount
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
    }
  }

  await tx.moderationAction.create({
    data: {
      actorId: input.actorId,
      targetUserId: comment.authorId,
      actionType: ModerationActionType.DELETE_COMMENT,
      targetType: ReportTargetType.COMMENT,
      targetId: comment.id,
      reason: input.reason,
      metadataJson: {
        postId: comment.postId,
        postTitle: comment.post.title
      }
    }
  });

  await tx.auditLog.create({
    data: {
      actorId: input.actorId,
      action: "delete_comment_by_report",
      entityType: "comment",
      entityId: comment.id,
      payloadJson: {
        postId: comment.postId,
        postTitle: comment.post.title,
        reason: input.reason
      }
    }
  });

  await createNotification(tx, {
    userId: comment.authorId,
    type: NotificationType.CONTENT_REVIEW,
    payload: {
      title: "你的评论已被管理员移除",
      body: input.reason
        ? `你在《${comment.post.title}》下的评论已被移除，原因：${input.reason}`
        : `你在《${comment.post.title}》下的评论已被管理员移除。`,
      href: `/posts/${comment.postId}#comments`
    }
  });

  return comment;
}

async function updateUserRestrictionStatus(
  tx: TransactionClient,
  input: {
    userId: string;
    actorId: string;
    action: UserRestrictionValue | "MUTE_3_DAYS" | "MUTE_7_DAYS" | "BAN_USER";
    reason: string | null;
  }
) {
  const user = await tx.user.findUnique({
    where: {
      id: input.userId
    },
    select: {
      id: true,
      username: true,
      status: true
    }
  });

  if (!user) {
    return null;
  }

  let nextStatus = user.status;
  let actionType: ModerationActionType;
  let mutedUntil: Date | null = null;
  let notificationTitle = "";
  let notificationBody = "";

  if (input.action === "MUTE_1_DAY" || input.action === "MUTE_3_DAYS" || input.action === "MUTE_7_DAYS") {
    const days = input.action === "MUTE_1_DAY" ? 1 : input.action === "MUTE_3_DAYS" ? 3 : 7;
    mutedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    nextStatus = UserStatus.MUTED;
    actionType = ModerationActionType.MUTE_USER;
    notificationTitle = "你的账号已被禁言";
    notificationBody = input.reason
      ? `账号已被禁言 ${days} 天，原因：${input.reason}`
      : `账号已被禁言 ${days} 天。`;
  } else if (input.action === "UNMUTE") {
    nextStatus = UserStatus.ACTIVE;
    actionType = ModerationActionType.UNMUTE_USER;
    notificationTitle = "你的账号禁言已解除";
    notificationBody = "账号已恢复正常发言权限。";
  } else if (input.action === "BAN" || input.action === "BAN_USER") {
    nextStatus = UserStatus.BANNED;
    actionType = ModerationActionType.BAN_USER;
    notificationTitle = "你的账号已被封禁";
    notificationBody = input.reason
      ? `账号已被封禁，原因：${input.reason}`
      : "账号已被管理员封禁。";
  } else {
    nextStatus = UserStatus.ACTIVE;
    actionType = ModerationActionType.UNBAN_USER;
    notificationTitle = "你的账号封禁已解除";
    notificationBody = "账号已恢复正常状态。";
  }

  await tx.user.update({
    where: {
      id: user.id
    },
    data: {
      status: nextStatus,
      mutedUntil: nextStatus === UserStatus.MUTED ? mutedUntil : null,
      bannedAt: nextStatus === UserStatus.BANNED ? new Date() : null
    }
  });

  await tx.moderationAction.create({
    data: {
      actorId: input.actorId,
      targetUserId: user.id,
      actionType,
      targetType: ReportTargetType.USER,
      targetId: user.id,
      reason: input.reason,
      metadataJson: {
        username: user.username,
        fromStatus: user.status,
        toStatus: nextStatus,
        mutedUntil: mutedUntil?.toISOString() ?? null
      }
    }
  });

  await tx.auditLog.create({
    data: {
      actorId: input.actorId,
      action: actionType.toLowerCase(),
      entityType: "user",
      entityId: user.id,
      payloadJson: {
        username: user.username,
        fromStatus: user.status,
        toStatus: nextStatus,
        reason: input.reason,
        mutedUntil: mutedUntil?.toISOString() ?? null
      }
    }
  });

  await createNotification(tx, {
    userId: user.id,
    type: NotificationType.SYSTEM,
    payload: {
      title: notificationTitle,
      body: notificationBody,
      href: "/account-status?status=ACTIVE"
    }
  });

  return {
    user,
    nextStatus
  };
}

export async function resolveReport(
  adminId: string,
  rawInput: Record<string, FormDataEntryValue | undefined>
) {
  const parsed = reportResolutionSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      ok: false,
      message: "请检查举报处理信息后再提交。",
      fieldErrors: validationErrors(parsed.error)
    };
  }

  const normalizedNote = parsed.data.resolutionNote || null;

  if (parsed.data.action !== "RESOLVE_ONLY" && !normalizedNote) {
    return {
      ok: false,
      message: "执行治理动作时请填写处理说明。",
      fieldErrors: {
        resolutionNote: "执行治理动作时请填写处理说明"
      }
    };
  }

  return prisma.$transaction(async (tx) => {
    const report = await tx.report.findUnique({
      where: {
        id: parsed.data.reportId
      },
      select: {
        id: true,
        targetType: true,
        targetId: true,
        status: true
      }
    });

    if (!report) {
      return {
        ok: false,
        message: "未找到对应举报。"
      } as const;
    }

    if (report.status === ReportStatus.RESOLVED || report.status === ReportStatus.REJECTED) {
      return {
        ok: false,
        message: "该举报已经被处理，请刷新后查看最新状态。"
      } as const;
    }

    const target = await resolveReportTarget(tx, {
      targetType: report.targetType,
      targetId: report.targetId
    });

    if (!target) {
      return {
        ok: false,
        message: "举报目标已经不存在，无法继续处理。"
      } as const;
    }

    if (parsed.data.action === "DELETE_POST" && report.targetType !== ReportTargetType.POST) {
      return {
        ok: false,
        message: "当前举报目标不是帖子，不能执行删帖。"
      } as const;
    }

    if (parsed.data.action === "DELETE_COMMENT" && report.targetType !== ReportTargetType.COMMENT) {
      return {
        ok: false,
        message: "当前举报目标不是评论，不能执行删评。"
      } as const;
    }

    let nextStatus: ReportStatus = ReportStatus.RESOLVED;

    if (parsed.data.action === "REJECT_REPORT") {
      nextStatus = ReportStatus.REJECTED;
    } else if (parsed.data.action === "DELETE_POST") {
      await deletePostByModeration(tx, {
        postId: report.targetId,
        actorId: adminId,
        reason: normalizedNote
      });
    } else if (parsed.data.action === "DELETE_COMMENT") {
      await deleteCommentByModeration(tx, {
        commentId: report.targetId,
        actorId: adminId,
        reason: normalizedNote
      });
    } else if (parsed.data.action === "MUTE_3_DAYS" || parsed.data.action === "MUTE_7_DAYS") {
      if (!target.ownerUserId) {
        return {
          ok: false,
          message: "当前举报目标无法定位到对应用户，不能执行禁言。"
        } as const;
      }

      await updateUserRestrictionStatus(tx, {
        userId: target.ownerUserId,
        actorId: adminId,
        action: parsed.data.action,
        reason: normalizedNote
      });
    } else if (parsed.data.action === "BAN_USER") {
      if (!target.ownerUserId) {
        return {
          ok: false,
          message: "当前举报目标无法定位到对应用户，不能执行封禁。"
        } as const;
      }

      await updateUserRestrictionStatus(tx, {
        userId: target.ownerUserId,
        actorId: adminId,
        action: "BAN_USER",
        reason: normalizedNote
      });
    }

    await tx.report.update({
      where: {
        id: report.id
      },
      data: {
        status: nextStatus,
        assigneeId: adminId,
        resolverId: adminId,
        resolutionNote: normalizedNote,
        resolvedAt: new Date()
      }
    });

    await tx.moderationAction.create({
      data: {
        actorId: adminId,
        targetUserId: target.ownerUserId ?? null,
        reportId: report.id,
        actionType: ModerationActionType.HANDLE_REPORT,
        targetType: report.targetType,
        targetId: report.targetId,
        reason: normalizedNote,
        metadataJson: {
          targetLabel: target.label,
          decision: parsed.data.action,
          reportStatus: nextStatus
        }
      }
    });

    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: "handle_report",
        entityType: "report",
        entityId: report.id,
        payloadJson: {
          targetType: report.targetType,
          targetId: report.targetId,
          targetLabel: target.label,
          action: parsed.data.action,
          reportStatus: nextStatus,
          resolutionNote: normalizedNote
        }
      }
    });

    return {
      ok: true,
      message:
        nextStatus === ReportStatus.REJECTED
          ? "举报已驳回。"
          : `举报已处理，动作：${parsed.data.action}。`
    } as const;
  });
}

const governanceUserSelect = {
  id: true,
  username: true,
  status: true,
  mutedUntil: true,
  bannedAt: true,
  lastLoginAt: true,
  createdAt: true,
  profile: {
    select: {
      nickname: true,
      bio: true
    }
  }
} satisfies Prisma.UserSelect;

export async function listGovernanceUsers(filters?: {
  query?: string;
  status?: UserStatus;
  page?: number;
  take?: number;
}) {
  const search = buildSearchContains(filters?.query ?? "");
  const pageSize = normalizePageTake(filters?.take, 12, 40);
  const where = {
    status: filters?.status ?? {
      in: [UserStatus.ACTIVE, UserStatus.MUTED, UserStatus.BANNED]
    },
    ...(search
      ? {
          OR: [
            {
              username: {
                contains: search,
                mode: "insensitive"
              }
            },
            {
              profile: {
                is: {
                  nickname: {
                    contains: search,
                    mode: "insensitive"
                  }
                }
              }
            }
          ]
        }
      : {})
  } satisfies Prisma.UserWhereInput;
  const totalCount = await prisma.user.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const page = Math.min(normalizePageNumber(filters?.page), totalPages);
  const items = await prisma.user.findMany({
    where,
    select: governanceUserSelect,
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    skip: (page - 1) * pageSize,
    take: pageSize
  });

  return {
    items,
    totalCount,
    totalPages,
    page,
    pageSize
  };
}

export async function updateUserRestriction(
  adminId: string,
  rawInput: Record<string, FormDataEntryValue | undefined>
) {
  const parsed = userRestrictionSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      ok: false,
      message: "请检查治理动作后再提交。",
      fieldErrors: validationErrors(parsed.error)
    };
  }

  const normalizedReason = parsed.data.reason || null;

  if (
    parsed.data.action !== "UNMUTE" &&
    parsed.data.action !== "UNBAN" &&
    !normalizedReason
  ) {
    return {
      ok: false,
      message: "执行禁言或封禁时请填写原因。",
      fieldErrors: {
        reason: "执行禁言或封禁时请填写原因"
      }
    };
  }

  return prisma.$transaction(async (tx) => {
    const result = await updateUserRestrictionStatus(tx, {
      userId: parsed.data.userId,
      actorId: adminId,
      action: parsed.data.action as UserRestrictionValue,
      reason: normalizedReason
    });

    if (!result) {
      return {
        ok: false,
        message: "未找到对应用户。"
      } as const;
    }

    return {
      ok: true,
      message: `已更新 @${result.user.username} 的治理状态。`
    } as const;
  });
}

export async function listSensitiveWordsForAdmin() {
  const [summary, items] = await Promise.all([
    prisma.sensitiveWord.groupBy({
      by: ["level"],
      _count: {
        _all: true
      },
      where: {
        isActive: true
      }
    }),
    prisma.sensitiveWord.findMany({
      orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
      select: {
        id: true,
        word: true,
        level: true,
        action: true,
        note: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    })
  ]);

  return {
    summary: {
      activeCount: items.filter((item) => item.isActive).length,
      severeCount: summary.find((item) => item.level === "SEVERE")?._count._all ?? 0,
      suspectCount: summary.find((item) => item.level === "SUSPECT")?._count._all ?? 0,
      generalCount: summary.find((item) => item.level === "GENERAL")?._count._all ?? 0
    },
    items
  };
}

export async function listAuditLogsForAdmin(filters?: {
  query?: string;
  action?: string;
  entityType?: string;
  createdFrom?: string;
  createdTo?: string;
  page?: number;
  take?: number;
}) {
  const search = buildSearchContains(filters?.query ?? "");
  const createdAt = buildCreatedAtFilter(filters?.createdFrom, filters?.createdTo);
  const pageSize = normalizePageTake(filters?.take, 20, 60);
  const where = {
    ...(filters?.action ? { action: filters.action } : {}),
    ...(filters?.entityType ? { entityType: filters.entityType } : {}),
    ...(createdAt ? { createdAt } : {}),
    ...(search
      ? {
          OR: [
            {
              action: {
                contains: search,
                mode: "insensitive"
              }
            },
            {
              entityType: {
                contains: search,
                mode: "insensitive"
              }
            },
            {
              actor: {
                is: {
                  OR: [
                    {
                      username: {
                        contains: search,
                        mode: "insensitive"
                      }
                    },
                    {
                      profile: {
                        is: {
                          nickname: {
                            contains: search,
                            mode: "insensitive"
                          }
                        }
                      }
                    }
                  ]
                }
              }
            }
          ]
        }
      : {})
  } satisfies Prisma.AuditLogWhereInput;
  const totalCount = await prisma.auditLog.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const page = Math.min(normalizePageNumber(filters?.page), totalPages);
  const items = await prisma.auditLog.findMany({
    where,
    orderBy: [{ createdAt: "desc" }],
    skip: (page - 1) * pageSize,
    take: pageSize,
    select: {
      id: true,
      action: true,
      entityType: true,
      entityId: true,
      payloadJson: true,
      createdAt: true,
      actor: {
        select: {
          username: true,
          profile: {
            select: {
              nickname: true
            }
          }
        }
      }
    }
  });

  return {
    items,
    totalCount,
    totalPages,
    page,
    pageSize
  };
}

export function getAuditLogPreview(payload: Prisma.JsonValue | null) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return "无附加信息";
  }

  const entries = Object.entries(payload as Record<string, unknown>)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .slice(0, 4)
    .map(([key, value]) => `${key}: ${String(value)}`);

  return entries.length > 0 ? entries.join(" / ") : "无附加信息";
}

export function getPendingContentExcerpt(value: string) {
  return excerptFromHtml(value) || "当前内容为空";
}
