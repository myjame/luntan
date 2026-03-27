# luntan

公开兴趣社区 MVP 项目仓库。

当前仓库已包含项目需求、执行清单以及一体化 `Next.js` 工程骨架，后续开发将以这些文档和当前目录结构为基线持续推进。

## 文档

- [MVP 需求与方案](./docs/community-mvp-spec.md)
- [技术任务清单](./docs/tech-task-list.md)
- [GitHub 提交说明](./docs/github-workflow.md)
- [项目架构说明](./docs/project-architecture.md)
- [数据模型基础说明](./docs/data-model-foundation.md)
- [前端视觉与交互方向](./docs/frontend-direction.md)
- [公开页渲染与缓存策略](./docs/rendering-strategy.md)
- [本地开发说明](./docs/local-development.md)
- [部署说明](./docs/deployment.md)
- [上传目录备份与清理策略](./docs/upload-backup-cleanup.md)

## 当前状态

- 已完成产品需求基线整理
- 已完成开发步骤与任务拆解
- 已完成一体化 `Next.js` 项目骨架落地
- 已完成 Prisma 核心数据模型、初始迁移与种子脚本
- 已完成注册登录、圈子、帖子、评论、私信、通知、治理后台主链路
- 已完成搜索、热度、积分、勋章与 `daily_stats` 轻量统计能力
- 已完成公开页 SEO、渲染策略、基础测试与部署文档补齐

## 当前工程结构

```text
src/
  app/
    (site)/        公开前台
    (user)/        用户中心
    admin/         管理后台
    api/           接口层
  components/      共享组件
  lib/             前端共享数据与工具
  server/          服务端配置与后续业务层
  modules/         按业务模块拆分
docs/              产品、任务与设计文档
```

## 已落地内容

- `Next.js + TypeScript + Tailwind CSS` 基础配置
- 前台首页、广场、发现、圈子页面骨架
- 用户中心与后台页面壳
- `Dockerfile` 与 `docker-compose.yml`
- 全局视觉变量、卡片体系和基础动效
- 健康检查接口：`/api/health`

## 本地启动

当前目录已经补齐启动所需配置文件，后续在有可用 Node 环境的机器上执行：

```bash
cp .env.example .env
npm install
npm run db:migrate:deploy
npm run db:seed
npm run dev
```

如使用 Docker：

```bash
docker compose up --build
```

生产部署建议使用：

```bash
docker compose -f docker-compose.prod.yml up -d --build
```
