# 部署说明

版本：v0.1  
日期：2026-03-27

## 1. 部署前检查

发布前先在代码目录执行：

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

## 2. 必填环境变量

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SITE_NAME`
- `DATABASE_URL`
- `REDIS_URL`
- `SESSION_SECRET`（至少 32 位随机串）
- `UPLOAD_DIR`

## 3. Docker 生产部署（推荐）

仓库提供生产镜像构建文件：

- `Dockerfile.prod`
- `docker-compose.prod.yml`

### 3.1 启动

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### 3.2 查看状态

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f app
```

### 3.3 健康检查

访问：

- `/api/health`

建议同时检查：

- 首页、帖子页、圈子页可访问
- 登录与后台鉴权正常
- 上传目录可写入

## 4. 非 Docker 部署（Node 进程）

1. 安装依赖：`npm ci`
2. 数据迁移：`npm run db:migrate:deploy`
3. 可选演示数据：`npm run db:seed`
4. 构建：`npm run build`
5. 启动：`npm run start`

建议使用 `systemd`、`pm2` 或容器编排系统托管进程。

## 5. 发布后建议

- 立刻替换默认管理员密码
- 将 `SESSION_SECRET` 改为随机强密码
- 为数据库、Redis、上传目录配置周期备份
- 配置日志收集和错误告警
