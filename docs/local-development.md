# 本地开发说明

版本：v0.1  
日期：2026-03-27

## 1. 环境要求

- Node.js `>=20.11.0`
- npm `>=11`
- PostgreSQL `>=16`（推荐 17）
- Redis `>=7`（推荐 8）

## 2. 初始化步骤

1. 安装依赖

```bash
npm install
```

2. 准备环境变量

```bash
cp .env.example .env
```

3. 启动数据库与缓存（推荐）

```bash
docker compose up -d postgres redis
```

4. 执行数据库迁移

```bash
npm run db:migrate:deploy
```

5. 初始化管理员与演示数据

```bash
npm run db:seed
```

6. 启动开发服务

```bash
npm run dev
```

## 3. 默认演示账号

`db:seed` 会创建初始管理员：

- 用户名：`admin`
- 密码：`Admin123456`

仅用于本地演示，生产环境必须立即修改并限制访问。

## 4. 常用检查命令

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

## 5. 上传目录维护

上传目录默认是 `UPLOAD_DIR`（本地默认 `./uploads`），备份与清理命令：

```bash
npm run uploads:backup
npm run uploads:cleanup
```

详细策略见：`docs/upload-backup-cleanup.md`。
