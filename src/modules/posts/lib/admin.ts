import "server-only";

import {
  ContentStatus,
  ModerationActionType,
  NotificationType,
  ReportTargetType,
  type Prisma
} from "@/generated/prisma/client";
import { createNotification } from "@/modules/notifications/lib/service";
import { prisma } from "@/server/db/prisma";

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

function buildSearchContains(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  return trimmed;
}

const adminPostSelect = {
  id: true,
  title: true,
  excerpt: true,
  status: true,
  isAnonymous: true,
  isPinned: true,
  isFeatured: true,
  isRecommended: true,
  commentCount: true,
  reactionCount: true,
  favoriteCount: true,
  publishedAt: true,
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
  },
  circle: {
    select: {
      id: true,
      name: true,
      slug: true
    }
  }
} satisfies Prisma.PostSelect;

const adminCommentSelect = {
  id: true,
  postId: true,
  parentId: true,
  status: true,
  isAnonymous: true,
  contentHtml: true,
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
  },
  post: {
    select: {
      id: true,
      title: true,
      circle: {
        select: {
          slug: true,
          name: true
        }
      }
    }
  }
} satisfies Prisma.CommentSelect;

export type AdminPostItem = Prisma.PostGetPayload<{
  select: typeof adminPostSelect;
}>;

export type AdminCommentItem = Prisma.CommentGetPayload<{
  select: typeof adminCommentSelect;
}>;

export async function getAdminPostSummary() {
  const [publishedCount, pinnedCount, featuredCount, recommendedCount] = await Promise.all([
    prisma.post.count({
      where: {
        status: ContentStatus.PUBLISHED,
        deletedAt: null
      }
    }),
    prisma.post.count({
      where: {
        status: ContentStatus.PUBLISHED,
        deletedAt: null,
        isPinned: true
      }
    }),
    prisma.post.count({
      where: {
        status: ContentStatus.PUBLISHED,
        deletedAt: null,
        isFeatured: true
      }
    }),
    prisma.post.count({
      where: {
        status: ContentStatus.PUBLISHED,
        deletedAt: null,
        isRecommended: true
      }
    })
  ]);

  return {
    publishedCount,
    pinnedCount,
    featuredCount,
    recommendedCount
  };
}

export async function listPostsForAdmin(filters?: {
  query?: string;
  status?: ContentStatus;
  page?: number;
  take?: number;
}) {
  const search = buildSearchContains(filters?.query ?? "");
  const pageSize = normalizePageTake(filters?.take, 12, 40);
  const where = {
    deletedAt: null,
    ...(filters?.status ? { status: filters.status } : {}),
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
  } satisfies Prisma.PostWhereInput;
  const totalCount = await prisma.post.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const page = Math.min(normalizePageNumber(filters?.page), totalPages);
  const items = await prisma.post.findMany({
    where,
    select: adminPostSelect,
    orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
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

export async function getAdminCommentSummary() {
  const [publishedCount, pendingCount, anonymousCount, deletedCount] = await Promise.all([
    prisma.comment.count({
      where: {
        status: ContentStatus.PUBLISHED,
        deletedAt: null
      }
    }),
    prisma.comment.count({
      where: {
        status: ContentStatus.PENDING_REVIEW,
        deletedAt: null
      }
    }),
    prisma.comment.count({
      where: {
        status: ContentStatus.PUBLISHED,
        deletedAt: null,
        isAnonymous: true
      }
    }),
    prisma.comment.count({
      where: {
        status: ContentStatus.DELETED
      }
    })
  ]);

  return {
    publishedCount,
    pendingCount,
    anonymousCount,
    deletedCount
  };
}

export async function listCommentsForAdmin(filters?: {
  query?: string;
  status?: ContentStatus;
  page?: number;
  take?: number;
}) {
  const search = buildSearchContains(filters?.query ?? "");
  const pageSize = normalizePageTake(filters?.take, 14, 50);
  const where = {
    ...(filters?.status ? { status: filters.status } : {}),
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
  } satisfies Prisma.CommentWhereInput;
  const totalCount = await prisma.comment.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const page = Math.min(normalizePageNumber(filters?.page), totalPages);
  const items = await prisma.comment.findMany({
    where,
    select: adminCommentSelect,
    orderBy: [{ createdAt: "desc" }],
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

export async function togglePostOperation(
  adminId: string,
  input: {
    postId: string;
    operation: "PIN" | "FEATURE" | "RECOMMEND";
  }
) {
  const post = await prisma.post.findUnique({
    where: {
      id: input.postId
    },
    select: {
      id: true,
      title: true,
      status: true,
      deletedAt: true,
      isPinned: true,
      isFeatured: true,
      isRecommended: true,
      authorId: true
    }
  });

  if (!post || post.deletedAt) {
    return {
      ok: false,
      message: "未找到对应帖子。"
    } as const;
  }

  const currentValue =
    input.operation === "PIN"
      ? post.isPinned
      : input.operation === "FEATURE"
        ? post.isFeatured
        : post.isRecommended;
  const nextValue = !currentValue;

  await prisma.$transaction(async (tx) => {
    await tx.post.update({
      where: {
        id: post.id
      },
      data:
        input.operation === "PIN"
          ? { isPinned: nextValue }
          : input.operation === "FEATURE"
            ? { isFeatured: nextValue }
            : { isRecommended: nextValue }
    });

    await tx.moderationAction.create({
      data: {
        actorId: adminId,
        targetUserId: post.authorId,
        actionType:
          input.operation === "PIN"
            ? ModerationActionType.PIN_POST
            : input.operation === "FEATURE"
              ? ModerationActionType.FEATURE_POST
              : ModerationActionType.RECOMMEND_POST,
        targetType: ReportTargetType.POST,
        targetId: post.id,
        metadataJson: {
          title: post.title,
          enabled: nextValue
        }
      }
    });

    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action:
          input.operation === "PIN"
            ? nextValue
              ? "pin_post"
              : "unpin_post"
            : input.operation === "FEATURE"
              ? nextValue
                ? "feature_post"
                : "unfeature_post"
              : nextValue
                ? "recommend_post"
                : "unrecommend_post",
        entityType: "post",
        entityId: post.id,
        payloadJson: {
          title: post.title,
          enabled: nextValue
        }
      }
    });
  });

  return {
    ok: true,
    message: `${post.title} 的运营状态已更新。`
  } as const;
}

export async function adminDeletePost(
  adminId: string,
  input: {
    postId: string;
    reason?: string | null;
  }
) {
  const post = await prisma.post.findUnique({
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
    return {
      ok: false,
      message: "未找到可删除的帖子。"
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

    await tx.moderationAction.create({
      data: {
        actorId: adminId,
        targetUserId: post.authorId,
        actionType: ModerationActionType.DELETE_POST,
        targetType: ReportTargetType.POST,
        targetId: post.id,
        reason: input.reason ?? null,
        metadataJson: {
          title: post.title,
          circleName: post.circle.name,
          circleSlug: post.circle.slug
        }
      }
    });

    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: "delete_post_by_admin",
        entityType: "post",
        entityId: post.id,
        payloadJson: {
          title: post.title,
          circleName: post.circle.name,
          circleSlug: post.circle.slug,
          reason: input.reason ?? null
        }
      }
    });

    await createNotification(tx, {
      userId: post.authorId,
      type: NotificationType.SYSTEM,
      payload: {
        title: "你的帖子已被后台移除",
        body: input.reason
          ? `帖子《${post.title}》已被后台移除，原因：${input.reason}`
          : `帖子《${post.title}》已被后台移除。`,
        href: `/circles/${post.circle.slug}`
      }
    });
  });

  return {
    ok: true,
    message: `已删除帖子《${post.title}》。`
  } as const;
}

export async function adminDeleteComment(
  adminId: string,
  input: {
    commentId: string;
    reason?: string | null;
  }
) {
  const comment = await prisma.comment.findUnique({
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
      post: {
        select: {
          title: true,
          circle: {
            select: {
              slug: true
            }
          }
        }
      }
    }
  });

  if (!comment || comment.deletedAt) {
    return {
      ok: false,
      message: "未找到可删除的评论。"
    } as const;
  }

  await prisma.$transaction(async (tx) => {
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

    const publishedCountRemoved =
      (comment.status === ContentStatus.PUBLISHED ? 1 : 0) +
      descendantReplies.filter((item) => item.status === ContentStatus.PUBLISHED).length;

    if (publishedCountRemoved > 0) {
      await tx.post.update({
        where: {
          id: comment.postId
        },
        data: {
          commentCount: {
            decrement: publishedCountRemoved
          }
        }
      });
    }

    if (comment.parentId && comment.status === ContentStatus.PUBLISHED) {
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

    await tx.moderationAction.create({
      data: {
        actorId: adminId,
        targetUserId: comment.authorId,
        actionType: ModerationActionType.DELETE_COMMENT,
        targetType: ReportTargetType.COMMENT,
        targetId: comment.id,
        reason: input.reason ?? null,
        metadataJson: {
          postId: comment.postId,
          postTitle: comment.post.title
        }
      }
    });

    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: "delete_comment_by_admin",
        entityType: "comment",
        entityId: comment.id,
        payloadJson: {
          postId: comment.postId,
          postTitle: comment.post.title,
          reason: input.reason ?? null
        }
      }
    });

    await createNotification(tx, {
      userId: comment.authorId,
      type: NotificationType.SYSTEM,
      payload: {
        title: "你的评论已被后台移除",
        body: input.reason
          ? `你在《${comment.post.title}》下的评论已被后台移除，原因：${input.reason}`
          : `你在《${comment.post.title}》下的评论已被后台移除。`,
        href: `/posts/${comment.postId}#comments`
      }
    });
  });

  return {
    ok: true,
    message: "评论已删除。"
  } as const;
}
