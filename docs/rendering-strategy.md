# 公开页渲染与缓存策略

版本：v0.1  
日期：2026-03-27

## 1. 目标

- 公开内容优先保证可访问与可收录
- 登录区、用户中心、后台默认动态渲染
- 高频列表使用轻量运行时缓存减少重复查询

## 2. 页面渲染策略

### 2.1 公开页（SSR + SEO）

以下页面使用服务端渲染，并在页面内补齐基础 SEO 元数据：

- `/` 首页
- `/circles/[slug]` 圈子详情
- `/posts/[postId]` 帖子详情

补充说明：

- `robots.txt`：`src/app/robots.ts`
- `sitemap.xml`：`src/app/sitemap.ts`
- SEO 构建工具：`src/lib/metadata.ts`

### 2.2 动态页面（force-dynamic）

以下入口强制动态渲染，避免用户态数据被错误复用：

- 登录与注册：`/login`、`/register`
- 用户中心：`/me/**`
- 用户主页：`/users/[username]`
- 后台：`/admin/**`

## 3. 运行时缓存点

当前采用进程内运行时缓存（`src/server/runtime-cache.ts`）作为首版轻量方案：

- 首页关注流：`posts:home:following:*`（12 秒）
- 首页热门流：`posts:home:hot:*`（12 秒）
- 广场热门流：`posts:square:hot:*`（12 秒）
- 通知列表轮询：`notifications:user:*:list:*`（8 秒）
- 通知未读数轮询：`notifications:user:*:unread-count`（8 秒）

缓存失效策略：

- 通知创建、已读、全部已读、会话已读时主动失效通知缓存前缀
- 其他流量入口依赖短 TTL 自动更新

## 4. 后续升级建议

- 多实例部署时将运行时缓存迁移到 Redis
- 为热门榜衰减参数增加后台可调配置
- 为公开页增加更细粒度 revalidate 策略与可观测性指标
