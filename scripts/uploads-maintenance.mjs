#!/usr/bin/env node

import { cp, mkdir, readdir, rm, stat } from "node:fs/promises";
import path from "node:path";

function usage() {
  console.log(`
用法:
  node scripts/uploads-maintenance.mjs backup [--upload-dir=./uploads] [--backup-dir=./backups/uploads]
  node scripts/uploads-maintenance.mjs cleanup [--days=30] [--upload-dir=./uploads] [--backup-dir=./backups/uploads] [--dry-run]
`);
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const options = {
    uploadDir: process.env.UPLOAD_DIR ?? "./uploads",
    backupDir: process.env.UPLOAD_BACKUP_DIR ?? "./backups/uploads",
    days: 30,
    dryRun: false
  };

  for (const arg of rest) {
    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    const [name, value] = arg.split("=");

    if (!value) {
      continue;
    }

    if (name === "--upload-dir") {
      options.uploadDir = value;
      continue;
    }

    if (name === "--backup-dir") {
      options.backupDir = value;
      continue;
    }

    if (name === "--days") {
      const parsed = Number(value);

      if (Number.isFinite(parsed) && parsed >= 1) {
        options.days = Math.floor(parsed);
      }
    }
  }

  return {
    command,
    options
  };
}

function formatTimestamp(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");

  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

async function ensureDirectory(targetPath) {
  await mkdir(targetPath, { recursive: true });
}

async function doBackup({ uploadDir, backupDir, dryRun }) {
  const resolvedUploadDir = path.resolve(uploadDir);
  const resolvedBackupDir = path.resolve(backupDir);
  const snapshotDir = path.join(resolvedBackupDir, `snapshot-${formatTimestamp()}`);

  await ensureDirectory(resolvedBackupDir);

  if (dryRun) {
    console.log(`[dry-run] 备份目录将创建为: ${snapshotDir}`);
    console.log(`[dry-run] 将复制: ${resolvedUploadDir} -> ${snapshotDir}`);
    return;
  }

  await cp(resolvedUploadDir, snapshotDir, {
    recursive: true,
    force: false,
    errorOnExist: false
  });

  console.log(`备份完成: ${resolvedUploadDir} -> ${snapshotDir}`);
}

async function removeExpiredBackups({ backupDir, expireBeforeMs, dryRun }) {
  const entries = await readdir(backupDir, { withFileTypes: true });
  let removed = 0;

  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.startsWith("snapshot-")) {
      continue;
    }

    const fullPath = path.join(backupDir, entry.name);
    const info = await stat(fullPath);

    if (info.mtimeMs >= expireBeforeMs) {
      continue;
    }

    if (dryRun) {
      console.log(`[dry-run] 将删除过期备份: ${fullPath}`);
    } else {
      await rm(fullPath, { recursive: true, force: true });
      console.log(`已删除过期备份: ${fullPath}`);
    }

    removed += 1;
  }

  return removed;
}

async function removeExpiredTmpFiles({ uploadDir, expireBeforeMs, dryRun }) {
  const tmpDir = path.join(uploadDir, "tmp");
  let entries = [];

  try {
    entries = await readdir(tmpDir, { withFileTypes: true });
  } catch {
    return 0;
  }

  let removed = 0;

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }

    const fullPath = path.join(tmpDir, entry.name);
    const info = await stat(fullPath);

    if (info.mtimeMs >= expireBeforeMs) {
      continue;
    }

    if (dryRun) {
      console.log(`[dry-run] 将删除过期临时文件: ${fullPath}`);
    } else {
      await rm(fullPath, { force: true });
      console.log(`已删除过期临时文件: ${fullPath}`);
    }

    removed += 1;
  }

  return removed;
}

async function doCleanup({ uploadDir, backupDir, days, dryRun }) {
  const resolvedUploadDir = path.resolve(uploadDir);
  const resolvedBackupDir = path.resolve(backupDir);
  const expireBeforeMs = Date.now() - days * 24 * 60 * 60 * 1000;

  await ensureDirectory(resolvedBackupDir);

  const [removedBackups, removedTmpFiles] = await Promise.all([
    removeExpiredBackups({
      backupDir: resolvedBackupDir,
      expireBeforeMs,
      dryRun
    }),
    removeExpiredTmpFiles({
      uploadDir: resolvedUploadDir,
      expireBeforeMs,
      dryRun
    })
  ]);

  console.log(`清理完成: 过期备份 ${removedBackups} 个, 临时文件 ${removedTmpFiles} 个`);
}

async function main() {
  const { command, options } = parseArgs(process.argv.slice(2));

  if (!command || !["backup", "cleanup"].includes(command)) {
    usage();
    process.exitCode = 1;
    return;
  }

  if (command === "backup") {
    await doBackup(options);
    return;
  }

  await doCleanup(options);
}

main().catch((error) => {
  console.error("执行上传目录维护脚本失败:", error);
  process.exitCode = 1;
});
