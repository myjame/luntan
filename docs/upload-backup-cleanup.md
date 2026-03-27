# 上传目录备份与清理策略

版本：v0.1  
日期：2026-03-27

## 1. 目录约定

- 上传目录：`UPLOAD_DIR`（默认 `./uploads`）
- 备份目录：`UPLOAD_BACKUP_DIR`（默认 `./backups/uploads`）
- 临时目录：`$UPLOAD_DIR/tmp`

## 2. 策略目标

- 可快速回滚上传文件
- 清理过期备份与临时文件，控制磁盘占用
- 避免误删真实业务附件

## 3. 维护脚本

脚本位置：`scripts/uploads-maintenance.mjs`

### 3.1 备份快照

```bash
npm run uploads:backup
```

会在备份目录创建 `snapshot-YYYYMMDD-HHmmss` 全量快照。

### 3.2 清理过期文件

```bash
npm run uploads:cleanup
```

默认规则：

- 删除超过 30 天的备份快照目录
- 删除 `UPLOAD_DIR/tmp` 中超过 30 天的临时文件

可预演不落盘删除：

```bash
node scripts/uploads-maintenance.mjs cleanup --days=30 --dry-run
```

## 4. 恢复流程

1. 停止写入（进入维护窗口）
2. 选择目标快照目录
3. 将快照内容覆盖回 `UPLOAD_DIR`
4. 重启应用并抽样验证附件访问

## 5. 风险与边界

- 当前清理策略不会删除 `post-attachments` 的正式业务文件
- 若要做“数据库孤儿文件”清理，需新增 DB 对账脚本后再上线
- 生产环境建议将备份目录挂载到独立持久化存储并加异地备份

## 6. 定时任务示例（Linux crontab）

```cron
0 3 * * * cd /srv/luntan && npm run uploads:backup
30 3 * * * cd /srv/luntan && npm run uploads:cleanup
```
