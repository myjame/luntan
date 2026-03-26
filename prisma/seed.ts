import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient, UserRole, UserStatus } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to run seed.");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {
      status: UserStatus.ACTIVE,
      role: UserRole.SUPER_ADMIN
    },
    create: {
      username: "admin",
      email: "admin@example.com",
      passwordHash: "seed_admin_password_pending_auth_setup",
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

  await prisma.circle.upsert({
    where: { slug: "movie-club" },
    update: {
      name: "观影研究所",
      status: "ACTIVE",
      ownerId: admin.id
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
      status: "ACTIVE"
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
      eventType: "POST_CREATE",
      description: "用户发布帖子时增加积分。",
      points: 5,
      dailyLimit: 5
    },
    {
      name: "评论奖励",
      eventType: "COMMENT_CREATE",
      description: "用户发表评论时增加积分。",
      points: 2,
      dailyLimit: 10
    }
  ] as const;

  for (const item of pointRules) {
    await prisma.pointRule.upsert({
      where: { name: item.name },
      update: item,
      create: item
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
