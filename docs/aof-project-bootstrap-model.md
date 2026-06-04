# AOF Project Bootstrap Model

この文書は、AOF を **別プロジェクトへ持ち込むための install / bootstrap model** を定義する。

## Position

今の AOF は self-hosting repo ではかなり運用できるが、別プロジェクトで使い始める入口はまだ弱い。

現状の問題は次である。

- `.aof/` に何を置けばよいかが README だけでは分かりにくい
- AI が最初に読むべき project context が分散している
- managed-project topology と self-hosting topology の違いが install 時点で固定されない
- quickstart は bundled example を流す手順であり、**project onboarding** の手順ではない

したがって、AOF には **one-shot bootstrap path** が必要である。

## Goal

bootstrap の目標は次である。

1. AOF を使うために必要な file set を一括で配置できること
2. AI が最初に読むべき情報を canonical packet としてまとめられること
3. self-hosting / managed-project の topology を install 時点で固定できること
4. project ごとの初期 orientation を `.aof/` の中で渡せること

## Required Bootstrap Outputs

最低限、bootstrap は次を配置できるべきである。

### 1. Canonical `.aof/` Directory Skeleton

```text
.aof/
  decisions/
  sessions/
  context/
    active/
    summaries/
    snapshots/
    archive/
    threads/
  tasks/
    open/
    assigned/
    done/
    archived/
    retired/
  prompts/
    orchestrator/
    council/
    discovery/
    steward/
  goals/
    north-star.json
    operating-goal.json
    next-value-slice.json
```

### 2. AI Recognition Packet

AI が最初に project を読む時、少なくとも次が一括で参照できる必要がある。

- `.aof/goals/north-star.json`
- `.aof/goals/operating-goal.json`
- `.aof/goals/next-value-slice.json`
- `.aof/tasks/open/`
- `.aof/context/active/recent-confirmation-window.json`
- `.aof/context/active/project-orientation.json`
- `.aof/project-bootstrap.json`

ここで重要なのは、AI が repo 全体を無差別に読むのではなく、**最初に project operating packet を読む** ことである。

## `project-orientation.json`

bootstrap では `project-orientation.json` を first-class に置くべきである。

最低限ここに欲しいもの:

- project type
- product / domain summary
- repo boundaries
- protected areas
- required commands
- test / verification entrypoints
- deployment or release constraints
- human owner / approval boundary

これは brownfield repo で AI が毎回 README と codebase 全体から再推定するコストを減らす。

## `project-bootstrap.json`

install 時に生成する bootstrap manifest を置くべきである。

最低限の shape:

```json
{
  "bootstrap_type": "aof-project-bootstrap",
  "aof_version": "1.x",
  "topology": "managed-project",
  "install_mode": "runtime-on",
  "write_target": "aof/state",
  "orientation_ref": ".aof/context/active/project-orientation.json",
  "goals_ref": ".aof/goals",
  "tasks_ref": ".aof/tasks",
  "prompts_ref": ".aof/prompts"
}
```

これは AI に「この repo で AOF をどう読むべきか」を最初に知らせる install manifest である。

## Topology At Install Time

bootstrap は install 時に topology を固定できるべきである。

### Self-Hosting

- write target may be `main`
- `.aof/` is current operating truth for the repo itself

### Managed Project

- product `main` remains human-governed
- default write target should be `aof/state`
- cadence automation must not write `.aof/` directly to product `main`

この topology choice は **後から README で読むのではなく、install artifact に明示される方がよい**。

## Recommended Future Command

将来的には、次のような command が自然である。

```bash
node ./src/cli.js init-project \
  --project /path/to/repo \
  --topology managed-project \
  --write-target aof/state
```

この command がやるべきこと:

1. `.aof/` skeleton を生成する
2. `project-bootstrap.json` を書く
3. `project-orientation.json` の template を出す
4. goals / tasks の最小 seed file を出す
5. topology-aware write policy を明示する

## Non-Goals

この文書は次をまだ要求しない。

1. full autonomous AI onboarding
2. project-wide code summarization の自動生成
3. managed-project bootstrap command の即時実装
4. all prompt templates の fully opinionated seed

まず必要なのは、**AOF を別 repo に入れる時の canonical file set と AI recognition packet を固定すること** である。
