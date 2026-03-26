# GitHub 提交说明

版本：v0.1

日期：2026-03-26

## 1. 仓库地址

当前项目 GitHub 仓库地址：

- SSH：`git@github.com:myjame/luntan.git`
- 仓库页面：`https://github.com/myjame/luntan`

当前本地远端名：

- `origin`

## 2. 当前仓库 Git 配置

当前项目默认通过 SSH 推送到 GitHub。

检查当前 SSH 配置：

```bash
git config --get core.sshCommand
```

说明：

- 本地私钥路径、用户名目录等信息不写入仓库文档
- 如果后续更换机器或用户，需要重新配置对应 SSH key
- 需要时可在本机单独执行配置，不将具体私钥路径提交到仓库

## 3. 常用 Git 提交流程

### 3.1 查看当前状态

```bash
git status --short --branch
```

### 3.2 拉取最新代码

开始开发前建议先同步远端：

```bash
git pull --rebase origin main
```

### 3.3 添加改动

添加全部改动：

```bash
git add .
```

如果只提交部分文件，按需指定路径：

```bash
git add README.md docs/
```

### 3.4 提交代码

提交示例：

```bash
git commit -m "功能：初始化项目骨架"
```

提交信息规则：

- 本项目所有提交信息必须使用中文
- 提交信息应简洁说明本次改动内容
- 不使用英文提交说明作为正式提交内容

常用中文前缀建议：

- `功能`：新增功能
- `修复`：修复问题
- `文档`：文档更新
- `重构`：代码重构
- `样式`：样式或格式调整
- `维护`：杂项维护

### 3.5 推送到 GitHub

首次推送主分支：

```bash
git push -u origin main
```

后续常规推送：

```bash
git push
```

## 4. 本项目建议提交流程

建议每完成一个小步骤就提交一次，保持提交粒度清晰。

推荐流程：

```bash
git status --short --branch
git add .
git commit -m "功能：完成某个步骤"
git push
```

如果开始开发前远端有变化，建议先执行：

```bash
git pull --rebase origin main
```

## 5. 初始化或重建远端的参考命令

如果未来在新目录重新初始化仓库，可参考以下命令：

```bash
git init -b main
git remote add origin git@github.com:myjame/luntan.git
git config core.sshCommand "ssh -i <你的私钥路径> -o IdentitiesOnly=yes"
```

## 6. 后续约定

- 本项目后续所有代码和文档默认同步到 `origin`
- 默认主分支为 `main`
- 每次完成一批可独立说明的改动后，及时提交并推送
- 所有新的提交信息统一使用中文
