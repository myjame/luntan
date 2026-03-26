# 数据模型基础说明

版本：v0.1

日期：2026-03-26

## 1. 目标

本文件用于说明当前社区 MVP 的 Prisma 数据模型设计原则和主要实体分组。

当前数据模型目标：

- 先支撑社区 MVP 主闭环
- 保证前台、用户中心、后台共用一套数据结构
- 兼顾匿名机制、审核治理、运营位和后续扩展

## 2. 分组结构

当前 schema 主要分为以下几个分组：

- 用户与账号：`users`、`user_profiles`、`user_settings`、`account_deletion_requests`
- 用户关系：`user_follows`、`user_blocks`
- 圈子系统：`circle_categories`、`circles`、`circle_manager_relations`、`circle_applications`、`circle_follows`
- 内容系统：`posts`、`post_revisions`、`post_tags`、`post_attachments`
- 评论与互动：`comments`、`comment_revisions`、`reactions`、`favorites`
- 投票系统：`polls`、`poll_options`、`poll_votes`
- 私信与通知：`conversations`、`conversation_participants`、`messages`、`notifications`
- 审核治理：`reports`、`moderation_actions`、`sensitive_words`、`audit_logs`
- 成长体系：`point_rules`、`point_ledger`、`badges`、`user_badges`
- 运营与统计：`banners`、`recommendation_slots`、`daily_stats`

## 3. 关键设计点

### 3.1 匿名能力

- 帖子和评论通过 `is_anonymous` 标记匿名状态
- 真实作者仍然通过 `author_id` 关联保存
- 前台通过业务层决定是否隐藏身份，后台可直接追溯

### 3.2 审核与治理

- 用户状态通过 `UserStatus` 统一管理
- 圈子申请、注销申请采用统一的 `WorkflowStatus`
- 帖子与评论共用 `ContentStatus`
- 举报、审核、禁言、封号等操作通过 `reports` 和 `moderation_actions` 承接

### 3.3 一体化工程支持

- 前台、用户中心、后台都基于同一套模型
- 关系型约束尽量在数据库层收住
- 针对公共列表、通知、审核队列等场景补了基础索引

### 3.4 可扩展性

- `content_json`、`payload_json`、`metadata_json` 等字段为后续扩展留口
- `recommendation_slots` 和 `banners` 预留运营能力
- `daily_stats` 和积分流水为增长能力打底

## 4. 当前种子数据

当前 seed 计划初始化以下内容：

- 一个超级管理员账号
- 一组圈子一级分类
- 一个演示圈子
- 一组基础敏感词样例
- 一组基础积分规则

## 5. 下一步建议

在当前 schema 基础上，下一步优先落地：

1. 认证与账号状态流转
2. 圈子与帖子主流程
3. 后台审核与治理入口
