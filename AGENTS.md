# 仓库 Agent 指令

在本仓库采取任何行动之前，先读 [README.md](README.md)（中英双语）与 [SPEC.md](SPEC.md)（统一规格）。贡献、安全与发布边界见 CONTRIBUTING.md / SECURITY.md / docs/release.md；词汇见 CONTEXT.md；发布史见 CHANGELOG.md。

## Agent skills

### Issue tracker

本仓库的 issue 与规格以 GitHub issues 承载，用 `gh` CLI 操作。见 `docs/agents/issue-tracker.md`。

### Triage labels

五个 triage 角色使用默认标签（`needs-triage` / `needs-info` / `ready-for-agent` / `ready-for-human` / `wontfix`）。见 `docs/agents/triage-labels.md`。

### Domain docs

单上下文（single-context）：根 `CONTEXT.md` + `docs/adr/`，二者均在需要时惰性创建。见 `docs/agents/domain.md`。
