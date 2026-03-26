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

本仓库已配置的 SSH 命令：

```bash
git config --get core.sshCommand
```

当前值：

```bash
ssh -i /home/xiaoming/.ssh/id_ed25519 -o IdentitiesOnly=yes
```

说明：

- 当前仓库默认使用 `/home/xiaoming/.ssh/id_ed25519` 这把私钥连接 GitHub
- 如果后续更换机器或用户，需要重新配置对应 SSH key

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
git commit -m "feat: initialize project scaffold"
```

常用提交前缀建议：

- `feat`: 新功能
- `fix`: 修复问题
- `docs`: 文档更新
- `refactor`: 重构
- `style`: 样式或格式调整
- `chore`: 杂项维护

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
git commit -m "feat: 完成某个步骤"
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
git config core.sshCommand "ssh -i /home/xiaoming/.ssh/id_ed25519 -o IdentitiesOnly=yes"
```

## 6. 当前已完成的首次提交

当前仓库首次提交信息：

```bash
5957b8d docs: add MVP spec and technical task list
```

## 7. 后续约定

- 本项目后续所有代码和文档默认同步到 `origin`
- 默认主分支为 `main`
- 每次完成一批可独立说明的改动后，及时提交并推送
