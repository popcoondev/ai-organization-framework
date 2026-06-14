# AOF Operations Model

この文書は、AOF を実際の repo でどう運用するかをまとめる。

## Two Topologies

### 1. Self-Hosting

この AOF repo 自体のように、framework repo が自分自身を管理対象にする形。

- `.aof/` is current operating truth
- runtime / cadence state may live with code
- maintainer judgement で `main` に state を戻せる

### 2. Managed Project

プロダクト repo や application repo に AOF を持ち込む形。

- product `main` is human-governed
- AOF state is separate from product code authority
- default write target is `aof/state`

managed-project が default であり、self-hosting は例外扱いである。

## Bootstrap And Install

AOF の現在の取得元は GitHub tag / release である。

```bash
git clone --branch v3.0.0 https://github.com/popcoondev/ai-organization-framework.git ~/.local/share/aof/v3.0.0
cd ~/.local/share/aof/v3.0.0
npm install
npm link
cd /path/to/your-project
aof init --topology managed-project
```

`aof init` がやること:

- `.aof/` skeleton を作る
- `project-bootstrap.json` を作る
- `project-orientation.json` を作る
- goals seed file を作る
- recent confirmation window を作る

## AI Recognition Packet

AI が最初に読むべき packet は次である。

- `.aof/project-bootstrap.json`
- `.aof/organization.json`
- `.aof/context/active/project-orientation.json`
- `.aof/goals/north-star.json`
- `.aof/goals/operating-goal.json`
- `.aof/goals/next-value-slice.json`
- `.aof/tasks/open/`
- `.aof/context/active/recent-confirmation-window.json`

## Command Classes

### Bootstrap

- `aof init`

### Lifecycle

- `aof run`
- `aof answer`
- `aof outcome-report`

### State Update

- `aof task-open`
- `aof task-update`
- `aof goal-project`
- `aof confirmation-window-record`

### Cadence

- `aof alignment-pulse`
- `aof cadence-trigger-guide`
- `aof cadence-follow-through`
- `aof self-audit-record`
- `aof retire-candidate-review`

## Current Constraint

現行 prototype では、完全自律の Codex daemon はまだ前提にしない。

いま成立しているのは、

- bootstrap
- runtime state update
- deterministic cadence artifacts
- Human-started Codex orchestration

までである。

## Current Product Baseline

現在の AOF product baseline では、少なくとも次が一体として揃っている必要がある。

- docs が少数ファイルに整理されている
- installer/bootstrap が current entrypoint になっている
- managed-project default がはっきりしている
- AI が最初に読む packet が固定されている
