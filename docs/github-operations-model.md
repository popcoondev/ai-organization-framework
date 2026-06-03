# GitHub Operations Model

AOF の GitHub 運用と branch strategy は、**topology-dependent** に扱う。

重要なのは、AOF の self-hosting repo に最適な運用を、  
そのまま managed project の default にしないことである。

## Position

AOF は次の 2 topology を区別する。

1. `self-hosting topology`
2. `managed-project topology`

この 2 つは、cadence automation が **どこへ write してよいか** が異なる。

## Topology 1: Self-Hosting

`self-hosting topology` とは、この AOF repository 自体が AOF の管理対象である形を指す。

例:

- `ai-organization-framework` repo 自体

この topology では:

- `.aof/` は repo の current operating truth
- cadence automation は `.aof/` state を repository に戻してよい
- `main` は code + current operating state の両方を含む

### Allowed Writes

- cadence bot may write `.aof/**` directly to `main`
- maintainer may push release or operating-state updates to `main`
- code changes should still prefer branch / PR when they are not tiny operational fixes

### Rationale

self-hosting では `.aof/` が repo 自体の active state なので、  
それを別 branch や別 repo に逃がすと current truth が分断されやすい。

## Topology 2: Managed Project

`managed-project topology` とは、AOF を使って**別の product/project repo** を運用する形を指す。

例:

- application repo
- game repo
- internal tool repo
- product website repo

この topology では:

- product `main` is human-governed source of truth for product code
- cadence automation must not write AOF state directly to product `main`

### Default Rule

managed project の default は次である。

> **cadence automation must not push `.aof/` state directly into product `main`.**

## Recommended Write Targets For Managed Projects

優先順は次のとおり。

### 1. `aof/state` branch

推奨 default。

- product code branch: `main`
- AOF state branch: `aof/state`

cadence automation は `aof/state` を更新する。  
product `main` には bot state commit を直接入れない。

### 2. Separate state repo

より強く分離したい場合。

- `project-repo`
- `project-aof-state`

規制や review boundary が強い場合に向く。

### 3. Artifact-only channel

最も安全だが self-hosting 性は弱い。

- workflow artifact
- PR comment
- issue comment
- dashboard input file outside product branch

## Branch Strategy

### Product Code

- human / AI implementation work: short-lived branches
- merge path: PR into `main`

例:

- `codex/<topic>`
- `claude/<topic>`
- `ops/<topic>`

### AOF State

topology ごとに分ける。

- self-hosting:
  - `.aof/` may update `main`
- managed-project:
  - `.aof/` should update `aof/state` or equivalent non-product target

## Cadence Scheduler Policy

cadence scheduler の write target も topology-dependent である。

### Self-Hosting

- scheduler profile may commit `.aof/` directly
- current repo uses GitHub Actions this way

### Managed Project

- scheduler should write to `aof/state` branch by default
- if branch write is not allowed, emit artifact-only outputs instead

## CI Policy

cadence state commit は product CI と分離する。

最低限:

- `.aof/**`-only commits should not trigger full product CI
- cadence workflow should have its own operational checks

これは self-hosting / managed-project の両方で有効である。

## Authority Boundary

この文書の中心ルールは次である。

1. product `main` remains human-governed
2. self-hosting exception must not become the general default
3. cadence automation write target is topology-dependent

## Current Repo

この repository は **self-hosting topology** を採用している。

したがって current implementation では:

- `Cadence Dispatch` GitHub Actions workflow may commit `.aof/` back to `main`

ただし、これは AOF の general default ではなく、  
この repo の topology-specific operating choice である。
