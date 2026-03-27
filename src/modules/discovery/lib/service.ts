import "server-only";

import {
  CircleStatus,
  ContentStatus,
  UserStatus,
  type Prisma
} from "@/generated/prisma/client";
import { listPublicCircles } from "@/modules/community/lib/service";
import { getHomeOperationContent } from "@/modules/operations/lib/service";
import { listHotGlobalTags, listSquarePosts } from "@/modules/posts/lib/service";
import { prisma } from "@/server/db/prisma";

function toDisplayName(input: {
  username: string;
  nickname?: string | null;
}) {
  return input.nickname ?? input.username;
}

const searchPostSelect = {
  id: true,
  title: true,
  excerpt: true,
  postType: true,
  isAnonymous: true,
  isPinned: true,
  isFeatured: true,
  isRecommended: true,
  scoreHot: true,
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

const searchCircleSelect = {
  id: true,
  name: true,
  slug: true,
  intro: true,
  followersCount: true,
  postsCount: true,
  category: {
    select: {
      name: true
    }
  }
} satisfies Prisma.CircleSelect;

const searchUserProfileSelect = {
  id: true,
  nickname: true,
  avatarUrl: true,
  bio: true,
  points: true,
  lastActiveAt: true,
  user: {
    select: {
      id: true,
      username: true
    }
  }
} satisfies Prisma.UserProfileSelect;

export type SearchPostItem = Prisma.PostGetPayload<{
  select: typeof searchPostSelect;
}>;

export type SearchCircleItem = Prisma.CircleGetPayload<{
  select: typeof searchCircleSelect;
}>;

export type SearchUserItem = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  points: number;
  lastActiveAt: Date | null;
};

function buildSearchContains(query: string) {
  const trimmed = query.trim();

  return trimmed.length > 0 ? trimmed : undefined;
}

export async function searchCommunity(query: string) {
  const search = buildSearchContains(query);

  if (!search) {
    return {
      posts: [] as SearchPostItem[],
      circles: [] as SearchCircleItem[],
      users: [] as SearchUserItem[]
    };
  }

  const [posts, circles, userProfiles] = await Promise.all([
    prisma.post.findMany({
      where: {
        status: ContentStatus.PUBLISHED,
        deletedAt: null,
        circle: {
          is: {
            status: CircleStatus.ACTIVE,
            deletedAt: null
          }
        },
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
          },
          {
            tags: {
              some: {
                tag: {
                  name: {
                    contains: search,
                    mode: "insensitive"
                  }
                }
              }
            }
          }
        ]
      },
      select: searchPostSelect,
      orderBy: [
        { isPinned: "desc" },
        { isRecommended: "desc" },
        { scoreHot: "desc" },
        { publishedAt: "desc" }
      ],
      take: 8
    }),
    prisma.circle.findMany({
      where: {
        status: CircleStatus.ACTIVE,
        deletedAt: null,
        OR: [
          {
            name: {
              contains: search,
              mode: "insensitive"
            }
          },
          {
            intro: {
              contains: search,
              mode: "insensitive"
            }
          },
          {
            category: {
              is: {
                name: {
                  contains: search,
                  mode: "insensitive"
                }
              }
            }
          }
        ]
      },
      select: searchCircleSelect,
      orderBy: [{ followersCount: "desc" }, { postsCount: "desc" }, { createdAt: "desc" }],
      take: 6
    }),
    prisma.userProfile.findMany({
      where: {
        user: {
          is: {
            status: UserStatus.ACTIVE
          }
        },
        OR: [
          {
            nickname: {
              contains: search,
              mode: "insensitive"
            }
          },
          {
            bio: {
              contains: search,
              mode: "insensitive"
            }
          },
          {
            user: {
              is: {
                username: {
                  contains: search,
                  mode: "insensitive"
                }
              }
            }
          }
        ]
      },
      select: searchUserProfileSelect,
      orderBy: [{ points: "desc" }, { lastActiveAt: "desc" }, { updatedAt: "desc" }],
      take: 6
    })
  ]);

  return {
    posts,
    circles,
    users: userProfiles.map((item) => ({
      id: item.user.id,
      username: item.user.username,
      displayName: toDisplayName({
        username: item.user.username,
        nickname: item.nickname
      }),
      avatarUrl: item.avatarUrl,
      bio: item.bio,
      points: item.points,
      lastActiveAt: item.lastActiveAt
    }))
  };
}

export async function getDiscoverPageData() {
  const [operations, hotTags, hotPosts, latestPosts, fallbackCircles, userProfiles] =
    await Promise.all([
      getHomeOperationContent(),
      listHotGlobalTags(10),
      listSquarePosts({
        sort: "HOT",
        take: 6
      }),
      listSquarePosts({
        sort: "NEWEST",
        take: 4
      }),
      listPublicCircles({
        take: 4
      }),
      prisma.userProfile.findMany({
        where: {
          user: {
            is: {
              status: UserStatus.ACTIVE
            }
          }
        },
        select: searchUserProfileSelect,
        orderBy: [{ points: "desc" }, { lastActiveAt: "desc" }, { updatedAt: "desc" }],
        take: 4
      })
    ]);

  const recommendedCircles =
    operations.recommendedCircles.length > 0
      ? operations.recommendedCircles
          .map((item) => item.circle)
          .filter((item): item is NonNullable<typeof item> => Boolean(item))
      : fallbackCircles;

  return {
    operations,
    hotTags,
    hotPosts,
    latestPosts,
    recommendedCircles,
    hotUsers: userProfiles.map((item) => ({
      id: item.user.id,
      username: item.user.username,
      displayName: toDisplayName({
        username: item.user.username,
        nickname: item.nickname
      }),
      avatarUrl: item.avatarUrl,
      bio: item.bio,
      points: item.points,
      lastActiveAt: item.lastActiveAt
    }))
  };
}
