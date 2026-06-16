# AOF Core Model

AI Organization Framework は、人間と AI の混成組織が、曖昧な要求を判断可能な形に変え、組織を編成し、成果物と結果を追跡し、その結果を次の判断へ還流させるための operating model である。

AOF は Agent Framework ではなく、AI Organization Operating System である。

## Core Position

AOF は次の立場を取る。

- request はそのまま実行しない
- 先に `Need / Intent / Context` を分ける
- raw need を project に直結させず、先に Need Validation を通す
- `Artifact` と `Outcome` を分けて追う
- 完成像と次の value slice を同時に持つ
- governance を必須とする
- agent ではなく organization を中心に置く
- role と agent を分離する
- 運用 state は `.aof/` に残す

## Minimal Loop

最小ループは次である。

1. request を受ける
2. raw need を `Need / Intent / Context` と前提に分ける
3. Need Validation で need を validate / reframe / reject / defer / experiment-required のいずれかに判定する
4. validated need がある場合だけ project charter を作る
5. council approval の後に project creation と organization / council / team / role 編成へ進む
6. `Decision / Action / Artifact / Outcome` を記録する
7. 結果を次の判断に還流する

## Pre-Project Gate

project creation 前の必須フローは次である。

```text
Need
  -> Need Validation
  -> Validated Need
  -> Project Charter
  -> Council Approval
  -> Project Creation
  -> Organization Formation
  -> Execution
```

validated need が存在しない project は non-compliant である。

## Core Objects

### Request Framing

- `Need`
- `Intent`
- `Context`
- `Validated Need`
- `Project Charter`

### Goal Layer

- `North Star Goal`
- `Current Operating Goal`
- `Next Value Slice`

### Execution Trace

- `Decision`
- `Action`
- `Artifact`
- `Outcome`

### Governance

最低限、次の観点が必要である。

- value / intent
- feasibility / execution
- risk / quality / safety

既定の shorthand としては `Visionary / Builder / Guardian` を使う。

### Organization Layer

- `Mission`
- `Project`
- `Organization`
- `Council`
- `Team`
- `Role`
- `Assignment`
- `Agent / Human / Tool`
- `Contract`
- `Dependency`
- `Knowledge`
- `Metrics`
- `Lifecycle`

Agent は末端実行者または resource であり、AOF の中心概念ではない。

## Runtime State

AOF の current operating state は `.aof/` に置く。

重要な領域は次である。

```text
.aof/
  goals/
  organization.json
  tasks/
  context/active/
  decisions/
  sessions/
  prompts/
```

特に AI が最初に読むべき current packet は次である。

- `.aof/project-bootstrap.json`
- `.aof/organization.json`
- `.aof/context/active/project-orientation.json`
- `.aof/goals/*.json`
- `.aof/tasks/open/*.json`
- `.aof/context/active/recent-confirmation-window.json`

## Current AI Orchestration Model

現行 Codex 仕様を前提にした current model は次である。

- Human starts parent Codex
- parent Codex reads and writes `.aof/`
- parent Codex may spawn role-scoped child work
- parent aggregates results
- parent updates runtime state

ここで重要なのは、

- cadence runtime
- Codex orchestration

を混同しないことである。

GitHub Actions や deterministic runtime は current state を更新できるが、それ自体が Codex parent ではない。

## Managed Project Default

外部プロジェクトに AOF を入れる場合の default は `managed-project` topology である。

- product `main` remains human-governed
- cadence automation must not write `.aof/` directly to product `main`
- default write target should be `aof/state`

## Current Entry Point

現在の最短入口は次である。

```bash
aof init --topology managed-project
```

この command は `.aof/` skeleton と project bootstrap packet を生成する。
