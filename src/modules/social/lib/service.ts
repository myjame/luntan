import "server-only";

import {
  CircleStatus,
  ContentStatus,
  ReactionTargetType,
  ReactionType,
  UserStatus,
  type Prisma
} from "@/generated/prisma/client";
import { prisma } from "@/server/db/prisma";
import {
  listFavoritePostsByUserId,
  listPostsByAuthorId
} from "@/modules/posts/lib/service";
import {
  commentEmojiOptions,
  type CommentEmojiValue
} from "@/modules/social/lib/constants";

function normalizePageTake(value: number | undefined, fallback: number, max: number) {
  if (!value || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(1, Math.min(max, Math.floor(value)));
}

const commentEmojiSet = new Set(commentEmojiOptions.map((item) => item.value));

const userSummarySelect = {
  id: true,
  username: true,
  createdAt: true,
  profile: {
    select: {
      nickname: true,
      avatarUrl: true,
      bio: true,
      points: true,
      lastActiveAt: true,
      featuredBadge: {
        select: {
          name: true
        }
      },
      titleBadge: {
        select: {
          name: true
        }
      }
    }
  }
} satisfies Prisma.UserSelect;

const userFollowCardSelect = {
  id: true,
  username: true,
  profile: {
    select: {
      nickname: true,
      avatarUrl: true,
      bio: true,
      points: true,
      lastActiveAt: true
    }
  }
} satisfies Prisma.UserSelect;

const userCommentSelect = {
  id: true,
  postId: true,
  contentHtml: true,
  contentJson: true,
  isAnonymous: true,
  reactionCount: true,
  createdAt: true,
  post: {
    select: {
      id: true,
      title: true,
      circle: {
        select: {
          name: true,
          slug: true
        }
      }
    }
  }
} satisfies Prisma.CommentSelect;

type UserFollowCardRecord = Prisma.UserGetPayload<{
  select: typeof userFollowCardSelect;
}>;

export type UserCommentListItem = Prisma.CommentGetPayload<{
  select: typeof userCommentSelect;
}>;

export type UserFollowCardItem = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  points: number;
  lastActiveAt: Date | null;
};

export type CommentEmojiState = Record<
  string,
  Array<{
    emojiCode: CommentEmojiValue;
    label: string;
    count: number;
    reacted: boolean;
  }>
>;

function toDisplayName(user: {
  username: string;
  profile?: {
    nickname?: string | null;
  } | null;
}) {
  return user.profile?.nickname ?? user.username;
}

function toFollowCard(user: UserFollowCardRecord): UserFollowCardItem {
  return {
    id: user.id,
    username: user.username,
    displayName: toDisplayName(user),
    avatarUrl: user.profile?.avatarUrl ?? null,
    bio: user.profile?.bio ?? null,
    points: user.profile?.points ?? 0,
    lastActiveAt: user.profile?.lastActiveAt ?? null
  };
}

function publicPostWhere(authorId: string, includeAnonymous: boolean) {
  return {
    authorId,
    status: ContentStatus.PUBLISHED,
    deletedAt: null,
    ...(includeAnonymous ? {} : { isAnonymous: false }),
    circle: {
      is: {
        status: CircleStatus.ACTIVE,
        deletedAt: null
      }
    }
  } satisfies Prisma.PostWhereInput;
}

function publicCommentWhere(authorId: string, includeAnonymous: boolean) {
  return {
    authorId,
    status: ContentStatus.PUBLISHED,
    deletedAt: null,
    ...(includeAnonymous ? {} : { isAnonymous: false }),
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
  } satisfies Prisma.CommentWhereInput;
}

export async function togglePostLike(userId: string, postId: string) {
  const post = await prisma.post.findFirst({
    where: {
      id: postId,
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
      title: true
    }
  });

  if (!post) {
    return {
      ok: false,
      message: "当前帖子暂时不能点赞。"
    } as const;
  }

  return prisma.$transaction(async (tx) => {
    const existingReaction = await tx.reaction.findFirst({
      where: {
        userId,
        targetType: ReactionTargetType.POST,
        targetId: post.id,
        reactionType: ReactionType.LIKE,
        emojiCode: null
      }
    });

    if (existingReaction) {
      await tx.reaction.deleteMany({
        where: {
          userId,
          targetType: ReactionTargetType.POST,
          targetId: post.id,
          reactionType: ReactionType.LIKE,
          emojiCode: null
        }
      });

      await tx.post.update({
        where: {
          id: post.id
        },
        data: {
          reactionCount: {
            decrement: 1
          }
        }
      });

      return {
        ok: true,
        message: `已取消对《${post.title}》的点赞。`,
        active: false
      } as const;
    }

    await tx.reaction.create({
      data: {
        userId,
        targetType: ReactionTargetType.POST,
        targetId: post.id,
        reactionType: ReactionType.LIKE,
        emojiCode: null
      }
    });

    await tx.post.update({
      where: {
        id: post.id
      },
      data: {
        reactionCount: {
          increment: 1
        }
      }
    });

    return {
      ok: true,
      message: `已点赞《${post.title}》。`,
      active: true
    } as const;
  });
}

export async function togglePostFavorite(userId: string, postId: string) {
  const post = await prisma.post.findFirst({
    where: {
      id: postId,
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
      title: true
    }
  });

  if (!post) {
    return {
      ok: false,
      message: "当前帖子暂时不能收藏。"
    } as const;
  }

  return prisma.$transaction(async (tx) => {
    const existingFavorite = await tx.favorite.findUnique({
      where: {
        userId_postId: {
          userId,
          postId: post.id
        }
      }
    });

    if (existingFavorite) {
      await tx.favorite.delete({
        where: {
          userId_postId: {
            userId,
            postId: post.id
          }
        }
      });

      await tx.post.update({
        where: {
          id: post.id
        },
        data: {
          favoriteCount: {
            decrement: 1
          }
        }
      });

      return {
        ok: true,
        message: `已取消收藏《${post.title}》。`,
        active: false
      } as const;
    }

    await tx.favorite.create({
      data: {
        userId,
        postId: post.id
      }
    });

    await tx.post.update({
      where: {
        id: post.id
      },
      data: {
        favoriteCount: {
          increment: 1
        }
      }
    });

    return {
      ok: true,
      message: `已收藏《${post.title}》。`,
      active: true
    } as const;
  });
}

export async function toggleCommentEmoji(input: {
  userId: string;
  commentId: string;
  emojiCode: string;
}) {
  if (!commentEmojiSet.has(input.emojiCode as CommentEmojiValue)) {
    return {
      ok: false,
      message: "不支持该表情回应。"
    } as const;
  }

  const comment = await prisma.comment.findFirst({
    where: {
      id: input.commentId,
      status: ContentStatus.PUBLISHED,
      deletedAt: null,
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
    select: {
      id: true
    }
  });

  if (!comment) {
    return {
      ok: false,
      message: "当前评论暂时不能回应。"
    } as const;
  }

  return prisma.$transaction(async (tx) => {
    const existingReaction = await tx.reaction.findUnique({
      where: {
        userId_targetType_targetId_reactionType_emojiCode: {
          userId: input.userId,
          targetType: ReactionTargetType.COMMENT,
          targetId: comment.id,
          reactionType: ReactionType.EMOJI,
          emojiCode: input.emojiCode
        }
      }
    });

    if (existingReaction) {
      await tx.reaction.delete({
        where: {
          userId_targetType_targetId_reactionType_emojiCode: {
            userId: input.userId,
            targetType: ReactionTargetType.COMMENT,
            targetId: comment.id,
            reactionType: ReactionType.EMOJI,
            emojiCode: input.emojiCode
          }
        }
      });

      await tx.comment.update({
        where: {
          id: comment.id
        },
        data: {
          reactionCount: {
            decrement: 1
          }
        }
      });

      return {
        ok: true,
        message: "已取消表情回应。",
        active: false
      } as const;
    }

    await tx.reaction.create({
      data: {
        userId: input.userId,
        targetType: ReactionTargetType.COMMENT,
        targetId: comment.id,
        reactionType: ReactionType.EMOJI,
        emojiCode: input.emojiCode
      }
    });

    await tx.comment.update({
      where: {
        id: comment.id
      },
      data: {
        reactionCount: {
          increment: 1
        }
      }
    });

    return {
      ok: true,
      message: "表情回应已记录。",
      active: true
    } as const;
  });
}

export async function getPostInteractionState(postId: string, userId?: string | null) {
  if (!userId) {
    return {
      isLiked: false,
      isFavorited: false
    } as const;
  }

  const [likeReaction, favorite] = await Promise.all([
    prisma.reaction.findFirst({
      where: {
        userId,
        targetType: ReactionTargetType.POST,
        targetId: postId,
        reactionType: ReactionType.LIKE,
        emojiCode: null
      },
      select: {
        id: true
      }
    }),
    prisma.favorite.findUnique({
      where: {
        userId_postId: {
          userId,
          postId
        }
      },
      select: {
        id: true
      }
    })
  ]);

  return {
    isLiked: Boolean(likeReaction),
    isFavorited: Boolean(favorite)
  } as const;
}

export async function getCommentEmojiState(
  commentIds: string[],
  userId?: string | null
): Promise<CommentEmojiState> {
  const uniqueCommentIds = Array.from(new Set(commentIds.filter(Boolean)));

  if (uniqueCommentIds.length === 0) {
    return {};
  }

  const reactions = await prisma.reaction.findMany({
    where: {
      targetType: ReactionTargetType.COMMENT,
      reactionType: ReactionType.EMOJI,
      targetId: {
        in: uniqueCommentIds
      },
      emojiCode: {
        in: commentEmojiOptions.map((item) => item.value)
      }
    },
    select: {
      targetId: true,
      emojiCode: true,
      userId: true
    }
  });

  const state = Object.fromEntries(
    uniqueCommentIds.map((commentId) => [
      commentId,
      commentEmojiOptions.map((item) => ({
        emojiCode: item.value,
        label: item.label,
        count: 0,
        reacted: false
      }))
    ])
  ) as CommentEmojiState;

  for (const reaction of reactions) {
    const emojiCode = reaction.emojiCode as CommentEmojiValue | null;

    if (!emojiCode) {
      continue;
    }

    const items = state[reaction.targetId];
    const target = items?.find((item) => item.emojiCode === emojiCode);

    if (!target) {
      continue;
    }

    target.count += 1;

    if (userId && reaction.userId === userId) {
      target.reacted = true;
    }
  }

  return state;
}

export async function followUser(followerId: string, username: string) {
  const targetUser = await prisma.user.findFirst({
    where: {
      username,
      status: UserStatus.ACTIVE
    },
    select: {
      id: true,
      username: true,
      profile: {
        select: {
          nickname: true
        }
      }
    }
  });

  if (!targetUser) {
    return {
      ok: false,
      message: "未找到可关注的用户。"
    } as const;
  }

  if (targetUser.id === followerId) {
    return {
      ok: false,
      message: "不能关注自己。"
    } as const;
  }

  return prisma.$transaction(async (tx) => {
    const existingFollow = await tx.userFollow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId: targetUser.id
        }
      }
    });

    if (existingFollow) {
      return {
        ok: true,
        message: `你已经关注了 ${toDisplayName(targetUser)}。`
      } as const;
    }

    await tx.userFollow.create({
      data: {
        followerId,
        followingId: targetUser.id
      }
    });

    return {
      ok: true,
      message: `已关注 ${toDisplayName(targetUser)}。`
    } as const;
  });
}

export async function unfollowUser(followerId: string, username: string) {
  const targetUser = await prisma.user.findFirst({
    where: {
      username,
      status: UserStatus.ACTIVE
    },
    select: {
      id: true,
      username: true,
      profile: {
        select: {
          nickname: true
        }
      }
    }
  });

  if (!targetUser) {
    return {
      ok: false,
      message: "未找到该用户。"
    } as const;
  }

  if (targetUser.id === followerId) {
    return {
      ok: false,
      message: "不能取消关注自己。"
    } as const;
  }

  return prisma.$transaction(async (tx) => {
    const existingFollow = await tx.userFollow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId: targetUser.id
        }
      }
    });

    if (!existingFollow) {
      return {
        ok: true,
        message: `你当前没有关注 ${toDisplayName(targetUser)}。`
      } as const;
    }

    await tx.userFollow.delete({
      where: {
        followerId_followingId: {
          followerId,
          followingId: targetUser.id
        }
      }
    });

    return {
      ok: true,
      message: `已取消关注 ${toDisplayName(targetUser)}。`
    } as const;
  });
}

export async function listUserComments(input: {
  userId: string;
  take?: number;
  includeAnonymous?: boolean;
}) {
  return prisma.comment.findMany({
    where: publicCommentWhere(input.userId, input.includeAnonymous !== false),
    select: userCommentSelect,
    orderBy: [{ createdAt: "desc" }],
    take: normalizePageTake(input.take, 6, 24)
  });
}

export async function listUserFollowCards(input: {
  userId: string;
  type: "following" | "followers";
  take?: number;
}) {
  if (input.type === "following") {
    const relations = await prisma.userFollow.findMany({
      where: {
        followerId: input.userId,
        following: {
          is: {
            status: UserStatus.ACTIVE
          }
        }
      },
      orderBy: [{ createdAt: "desc" }],
      select: {
        following: {
          select: userFollowCardSelect
        }
      },
      take: normalizePageTake(input.take, 6, 30)
    });

    return relations.map((item) => toFollowCard(item.following));
  }

  const relations = await prisma.userFollow.findMany({
    where: {
      followingId: input.userId,
      follower: {
        is: {
          status: UserStatus.ACTIVE
        }
      }
    },
    orderBy: [{ createdAt: "desc" }],
    select: {
      follower: {
        select: userFollowCardSelect
      }
    },
    take: normalizePageTake(input.take, 6, 30)
  });

  return relations.map((item) => toFollowCard(item.follower));
}

export async function getPublicUserProfile(username: string, viewerId?: string | null) {
  const user = await prisma.user.findFirst({
    where: {
      username,
      status: UserStatus.ACTIVE
    },
    select: userSummarySelect
  });

  if (!user) {
    return null;
  }

  const [followingCount, followersCount, postCount, commentCount, favoriteCount, relation, recentPosts, recentComments, recentFavorites] =
    await Promise.all([
      prisma.userFollow.count({
        where: {
          followerId: user.id
        }
      }),
      prisma.userFollow.count({
        where: {
          followingId: user.id
        }
      }),
      prisma.post.count({
        where: publicPostWhere(user.id, false)
      }),
      prisma.comment.count({
        where: publicCommentWhere(user.id, false)
      }),
      prisma.favorite.count({
        where: {
          userId: user.id,
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
        }
      }),
      viewerId && viewerId !== user.id
        ? Promise.all([
            prisma.userFollow.findUnique({
              where: {
                followerId_followingId: {
                  followerId: viewerId,
                  followingId: user.id
                }
              },
              select: {
                id: true
              }
            }),
            prisma.userFollow.findUnique({
              where: {
                followerId_followingId: {
                  followerId: user.id,
                  followingId: viewerId
                }
              },
              select: {
                id: true
              }
            })
          ])
        : Promise.resolve<[null, null]>([null, null]),
      listPostsByAuthorId({
        authorId: user.id,
        includeAnonymous: false,
        take: 4
      }),
      listUserComments({
        userId: user.id,
        includeAnonymous: false,
        take: 4
      }),
      listFavoritePostsByUserId({
        userId: user.id,
        take: 3
      })
    ]);

  return {
    user: {
      id: user.id,
      username: user.username,
      displayName: toDisplayName(user),
      avatarUrl: user.profile?.avatarUrl ?? null,
      bio: user.profile?.bio ?? null,
      points: user.profile?.points ?? 0,
      lastActiveAt: user.profile?.lastActiveAt ?? null,
      featuredBadgeName: user.profile?.featuredBadge?.name ?? null,
      titleBadgeName: user.profile?.titleBadge?.name ?? null,
      joinedAt: user.createdAt
    },
    stats: {
      followingCount,
      followersCount,
      postCount,
      commentCount,
      favoriteCount
    },
    relation: {
      canFollow: Boolean(viewerId && viewerId !== user.id),
      isFollowing: Boolean(relation[0]),
      followsViewer: Boolean(relation[1]),
      isMutual: Boolean(relation[0] && relation[1])
    },
    recentPosts,
    recentComments,
    recentFavorites
  };
}

export async function getMyDashboardData(userId: string) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId
    },
    select: userSummarySelect
  });

  if (!user) {
    return null;
  }

  const [followingCount, followersCount, postCount, commentCount, favoriteCount, recentPosts, recentComments, recentFavorites, followingUsers, followerUsers] =
    await Promise.all([
      prisma.userFollow.count({
        where: {
          followerId: user.id
        }
      }),
      prisma.userFollow.count({
        where: {
          followingId: user.id
        }
      }),
      prisma.post.count({
        where: publicPostWhere(user.id, true)
      }),
      prisma.comment.count({
        where: publicCommentWhere(user.id, true)
      }),
      prisma.favorite.count({
        where: {
          userId: user.id
        }
      }),
      listPostsByAuthorId({
        authorId: user.id,
        includeAnonymous: true,
        take: 4
      }),
      listUserComments({
        userId: user.id,
        includeAnonymous: true,
        take: 4
      }),
      listFavoritePostsByUserId({
        userId: user.id,
        take: 3
      }),
      listUserFollowCards({
        userId: user.id,
        type: "following",
        take: 4
      }),
      listUserFollowCards({
        userId: user.id,
        type: "followers",
        take: 4
      })
    ]);

  return {
    user: {
      id: user.id,
      username: user.username,
      displayName: toDisplayName(user),
      avatarUrl: user.profile?.avatarUrl ?? null,
      bio: user.profile?.bio ?? null,
      points: user.profile?.points ?? 0,
      lastActiveAt: user.profile?.lastActiveAt ?? null,
      featuredBadgeName: user.profile?.featuredBadge?.name ?? null,
      titleBadgeName: user.profile?.titleBadge?.name ?? null,
      joinedAt: user.createdAt
    },
    stats: {
      followingCount,
      followersCount,
      postCount,
      commentCount,
      favoriteCount
    },
    recentPosts,
    recentComments,
    recentFavorites,
    followingUsers,
    followerUsers
  };
}
