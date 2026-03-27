import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

import {
  BadgeKind,
  BannerStatus,
  PointEventType,
  PrismaClient,
  RecommendationSlotType,
  RecommendationTargetType,
  UserRole,
  UserStatus
} from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to run seed.");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

function createStatDate(offsetDays: number) {
  const date = new Date();

  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - offsetDays);

  return date;
}

async function main() {
  const adminPasswordHash = await bcrypt.hash("Admin123456", 10);

  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {
      status: UserStatus.ACTIVE,
      role: UserRole.SUPER_ADMIN,
      passwordHash: adminPasswordHash
    },
    create: {
      username: "admin",
      email: "admin@example.com",
      passwordHash: adminPasswordHash,
      status: UserStatus.ACTIVE,
      role: UserRole.SUPER_ADMIN,
      profile: {
        create: {
          nickname: "平台管理员",
          bio: "社区种子管理员账号，用于后台初始化和运营验证。"
        }
      },
      settings: {
        create: {}
      }
    }
  });

  const categorySeeds = [
    { name: "影视", slug: "movie-tv", sortOrder: 10 },
    { name: "游戏", slug: "games", sortOrder: 20 },
    { name: "动漫", slug: "anime", sortOrder: 30 },
    { name: "运动", slug: "sports", sortOrder: 40 },
    { name: "美食", slug: "food", sortOrder: 50 },
    { name: "音乐", slug: "music", sortOrder: 60 },
    { name: "生活", slug: "life", sortOrder: 70 },
    { name: "情感", slug: "relationships", sortOrder: 80 },
    { name: "校园", slug: "campus", sortOrder: 90 }
  ];

  for (const item of categorySeeds) {
    await prisma.circleCategory.upsert({
      where: { slug: item.slug },
      update: {
        name: item.name,
        sortOrder: item.sortOrder
      },
      create: item
    });
  }

  const movieCategory = await prisma.circleCategory.findUniqueOrThrow({
    where: { slug: "movie-tv" }
  });

  const gamesCategory = await prisma.circleCategory.findUniqueOrThrow({
    where: { slug: "games" }
  });

  const foodCategory = await prisma.circleCategory.findUniqueOrThrow({
    where: { slug: "food" }
  });

  const movieCircle = await prisma.circle.upsert({
    where: { slug: "movie-club" },
    update: {
      name: "观影研究所",
      status: "ACTIVE",
      ownerId: admin.id,
      followersCount: 1240,
      postsCount: 86
    },
    create: {
      categoryId: movieCategory.id,
      ownerId: admin.id,
      name: "观影研究所",
      slug: "movie-club",
      intro: "用于验证圈子、帖子和后台治理流程的演示圈子。",
      rules: "理性讨论，不剧透，不人身攻击。",
      announcement: "欢迎来到演示圈子，这里会优先承接帖子和投票功能验证。",
      allowAnonymous: true,
      status: "ACTIVE",
      followersCount: 1240,
      postsCount: 86
    }
  });

  const gameCircle = await prisma.circle.upsert({
    where: { slug: "night-arcade" },
    update: {
      name: "夜航游戏厅",
      status: "ACTIVE",
      ownerId: admin.id,
      followersCount: 910,
      postsCount: 57
    },
    create: {
      categoryId: gamesCategory.id,
      ownerId: admin.id,
      name: "夜航游戏厅",
      slug: "night-arcade",
      intro: "围绕单机、联机和主机游戏分享体验与陪伴感。",
      rules: "允许争论，但不允许引战和地图炮。",
      announcement: "每周会整理值得一玩的新作与冷门佳作。",
      allowAnonymous: true,
      status: "ACTIVE",
      followersCount: 910,
      postsCount: 57
    }
  });

  const foodCircle = await prisma.circle.upsert({
    where: { slug: "weekend-kitchen" },
    update: {
      name: "周末料理社",
      status: "ACTIVE",
      ownerId: admin.id,
      followersCount: 680,
      postsCount: 41
    },
    create: {
      categoryId: foodCategory.id,
      ownerId: admin.id,
      name: "周末料理社",
      slug: "weekend-kitchen",
      intro: "适合晒厨房实验、配方笔记和失败复盘的轻松圈子。",
      rules: "欢迎新手提问，鼓励提供可复现步骤。",
      announcement: "近期会继续补厨房实验和家常菜演示帖。",
      allowAnonymous: false,
      status: "ACTIVE",
      followersCount: 680,
      postsCount: 41
    }
  });

  const sensitiveWords = [
    { word: "违禁词示例A", level: "SEVERE", action: "BLOCK", note: "严重敏感词样例" },
    { word: "风险词示例B", level: "SUSPECT", action: "REVIEW", note: "疑似风险词样例" },
    { word: "提示词示例C", level: "GENERAL", action: "WARN", note: "一般风险词样例" }
  ] as const;

  for (const item of sensitiveWords) {
    await prisma.sensitiveWord.upsert({
      where: { word: item.word },
      update: {
        level: item.level,
        action: item.action,
        note: item.note
      },
      create: item
    });
  }

  const pointRules = [
    {
      name: "发帖奖励",
      eventType: PointEventType.POST_CREATE,
      description: "用户发布帖子时增加积分。",
      points: 5,
      dailyLimit: 5
    },
    {
      name: "评论奖励",
      eventType: PointEventType.COMMENT_CREATE,
      description: "用户发表评论时增加积分。",
      points: 2,
      dailyLimit: 10
    },
    {
      name: "获赞奖励",
      eventType: PointEventType.RECEIVE_LIKE,
      description: "帖子或评论获得点赞时增加积分。",
      points: 1,
      dailyLimit: 20
    },
    {
      name: "被收藏奖励",
      eventType: PointEventType.RECEIVE_FAVORITE,
      description: "内容被收藏时增加积分。",
      points: 3,
      dailyLimit: 10
    }
  ];

  for (const item of pointRules) {
    await prisma.pointRule.upsert({
      where: { name: item.name },
      update: item,
      create: item
    });
  }

  const activePointRules = await prisma.pointRule.findMany({
    where: {
      isActive: true
    },
    select: {
      id: true,
      eventType: true,
      name: true,
      points: true
    }
  });

  const badges = [
    {
      name: "深夜影评人",
      kind: BadgeKind.BADGE,
      description: "给持续输出高质量观影心得的用户。",
      grantCondition: "近 30 天发布 5 篇影评帖，且累计获赞超过 100。",
      iconUrl: "https://images.unsplash.com/photo-1517602302552-471fe67acf66?auto=format&fit=crop&w=600&q=80",
      isActive: true
    },
    {
      name: "氛围组组长",
      kind: BadgeKind.TITLE,
      description: "给擅长带动讨论气氛和组织互动活动的用户。",
      grantCondition: "圈内连续 4 周保持活跃，并组织至少 2 次运营活动。",
      iconUrl: null,
      isActive: true
    }
  ];

  const createdBadges = [];

  for (const item of badges) {
    const badge = await prisma.badge.upsert({
      where: { name: item.name },
      update: item,
      create: item
    });

    createdBadges.push(badge);
  }

  const featuredBadge = createdBadges.find((item) => item.kind === BadgeKind.BADGE) ?? null;
  const titleBadge = createdBadges.find((item) => item.kind === BadgeKind.TITLE) ?? null;

  if (featuredBadge) {
    const existing = await prisma.userBadge.findFirst({
      where: {
        userId: admin.id,
        badgeId: featuredBadge.id
      },
      select: {
        id: true
      }
    });

    if (!existing) {
      await prisma.userBadge.create({
        data: {
          userId: admin.id,
          badgeId: featuredBadge.id,
          grantedById: admin.id,
          reason: "种子数据初始化授予"
        }
      });
    }
  }

  if (titleBadge) {
    const existing = await prisma.userBadge.findFirst({
      where: {
        userId: admin.id,
        badgeId: titleBadge.id
      },
      select: {
        id: true
      }
    });

    if (!existing) {
      await prisma.userBadge.create({
        data: {
          userId: admin.id,
          badgeId: titleBadge.id,
          grantedById: admin.id,
          reason: "种子数据初始化授予"
        }
      });
    }
  }

  await prisma.userProfile.update({
    where: {
      userId: admin.id
    },
    data: {
      featuredBadgeId: featuredBadge?.id ?? null,
      titleBadgeId: titleBadge?.id ?? null,
      lastActiveAt: new Date()
    }
  });

  const banners = [
    {
      title: "春季观影周",
      subtitle: "把热映片、冷门片和观众情绪都聊透。",
      imageUrl: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80",
      linkUrl: "/circles/movie-club",
      sortOrder: 10,
      status: BannerStatus.ACTIVE
    },
    {
      title: "夜航游戏夜",
      subtitle: "围绕陪伴感和叙事张力，开一场不赶进度的游戏讨论。",
      imageUrl: "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?auto=format&fit=crop&w=1200&q=80",
      linkUrl: "/circles/night-arcade",
      sortOrder: 20,
      status: BannerStatus.ACTIVE
    },
    {
      title: "周末厨房实验",
      subtitle: "把失败复盘也变成值得分享的内容。",
      imageUrl: "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1200&q=80",
      linkUrl: "/circles/weekend-kitchen",
      sortOrder: 30,
      status: BannerStatus.ACTIVE
    }
  ];

  for (const item of banners) {
    const existing = await prisma.banner.findFirst({
      where: {
        title: item.title
      },
      select: {
        id: true
      }
    });

    if (existing) {
      await prisma.banner.update({
        where: {
          id: existing.id
        },
        data: item
      });
      continue;
    }

    await prisma.banner.create({
      data: item
    });
  }

  const recommendationSlots = [
    {
      slotType: RecommendationSlotType.HOMEPAGE_RECOMMENDED_CIRCLE,
      targetType: RecommendationTargetType.CIRCLE,
      title: "本周推荐圈子",
      description: "适合优先拉新和承接新内容的主圈子。",
      targetId: movieCircle.id,
      imageUrl: null,
      linkUrl: `/circles/${movieCircle.slug}`,
      sortOrder: 10,
      isActive: true
    },
    {
      slotType: RecommendationSlotType.HOMEPAGE_RECOMMENDED_CIRCLE,
      targetType: RecommendationTargetType.CIRCLE,
      title: "夜聊游戏推荐",
      description: "更偏陪伴感和故事性的游戏讨论房间。",
      targetId: gameCircle.id,
      imageUrl: null,
      linkUrl: `/circles/${gameCircle.slug}`,
      sortOrder: 20,
      isActive: true
    },
    {
      slotType: RecommendationSlotType.HOMEPAGE_RECOMMENDED_CIRCLE,
      targetType: RecommendationTargetType.CIRCLE,
      title: "厨房实验站",
      description: "适合展示教程、食谱和失败复盘的轻松内容场。",
      targetId: foodCircle.id,
      imageUrl: null,
      linkUrl: `/circles/${foodCircle.slug}`,
      sortOrder: 30,
      isActive: true
    },
    {
      slotType: RecommendationSlotType.HOMEPAGE_TOPIC,
      targetType: RecommendationTargetType.URL,
      title: "今天你最想重新看的电影是哪一部？",
      description: "把首页话题做成轻互动入口，而不只是标签堆叠。",
      targetId: null,
      imageUrl: null,
      linkUrl: "/discover",
      sortOrder: 10,
      isActive: true
    },
    {
      slotType: RecommendationSlotType.HOMEPAGE_ACTIVITY,
      targetType: RecommendationTargetType.URL,
      title: "本周热门投票",
      description: "围绕投票帖和活动帖做一块更有参与感的内容入口。",
      targetId: null,
      imageUrl: null,
      linkUrl: "/square",
      sortOrder: 10,
      isActive: true
    }
  ];

  for (const item of recommendationSlots) {
    const existing = await prisma.recommendationSlot.findFirst({
      where: {
        slotType: item.slotType,
        title: item.title
      },
      select: {
        id: true
      }
    });

    if (existing) {
      await prisma.recommendationSlot.update({
        where: {
          id: existing.id
        },
        data: item
      });
      continue;
    }

    await prisma.recommendationSlot.create({
      data: item
    });
  }

  const dailyStats = [
    { newUsers: 12, newPosts: 18, newComments: 61, newReports: 3, activeUsers: 96 },
    { newUsers: 10, newPosts: 15, newComments: 58, newReports: 2, activeUsers: 88 },
    { newUsers: 14, newPosts: 19, newComments: 67, newReports: 4, activeUsers: 104 },
    { newUsers: 9, newPosts: 12, newComments: 49, newReports: 2, activeUsers: 82 },
    { newUsers: 11, newPosts: 16, newComments: 55, newReports: 3, activeUsers: 91 },
    { newUsers: 8, newPosts: 11, newComments: 44, newReports: 1, activeUsers: 76 },
    { newUsers: 13, newPosts: 17, newComments: 63, newReports: 3, activeUsers: 99 }
  ];

  for (const [index, item] of dailyStats.entries()) {
    await prisma.dailyStat.upsert({
      where: {
        statDate: createStatDate(index)
      },
      update: item,
      create: {
        statDate: createStatDate(index),
        ...item
      }
    });
  }

  const seedLedgers = [
    {
      eventType: PointEventType.POST_CREATE,
      referenceType: "seed_post",
      referenceId: "seed-post-1",
      note: "发布演示帖子"
    },
    {
      eventType: PointEventType.POST_CREATE,
      referenceType: "seed_post",
      referenceId: "seed-post-2",
      note: "发布演示帖子"
    },
    {
      eventType: PointEventType.COMMENT_CREATE,
      referenceType: "seed_comment",
      referenceId: "seed-comment-1",
      note: "发布演示评论"
    },
    {
      eventType: PointEventType.RECEIVE_LIKE,
      referenceType: "seed_post_like",
      referenceId: "seed-like-1",
      note: "帖子收到点赞"
    },
    {
      eventType: PointEventType.RECEIVE_FAVORITE,
      referenceType: "seed_post_favorite",
      referenceId: "seed-favorite-1",
      note: "帖子被收藏"
    }
  ];

  for (const item of seedLedgers) {
    const rule = activePointRules.find((candidate) => candidate.eventType === item.eventType);

    if (!rule) {
      continue;
    }

    const existing = await prisma.pointLedger.findFirst({
      where: {
        userId: admin.id,
        ruleId: rule.id,
        referenceType: item.referenceType,
        referenceId: item.referenceId
      },
      select: {
        id: true
      }
    });

    if (existing) {
      continue;
    }

    const currentBalance = (
      await prisma.userProfile.findUnique({
        where: {
          userId: admin.id
        },
        select: {
          points: true
        }
      })
    )?.points ?? 0;

    await prisma.pointLedger.create({
      data: {
        userId: admin.id,
        ruleId: rule.id,
        operatorId: admin.id,
        eventType: item.eventType,
        delta: rule.points,
        balanceAfter: currentBalance + rule.points,
        referenceType: item.referenceType,
        referenceId: item.referenceId,
        note: item.note
      }
    });

    await prisma.userProfile.update({
      where: {
        userId: admin.id
      },
      data: {
        points: currentBalance + rule.points
      }
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
