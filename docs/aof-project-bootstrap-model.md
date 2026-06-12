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

## Where AOF Comes From

現時点で AOF の canonical acquisition source は、**GitHub release / tag** である。

最短の現実的な取得元は次である。

- spec/runtime source:
  - `https://github.com/popcoondev/ai-organization-framework/tree/v2.1.0`
- operational install source:
  - `git clone --branch v2.1.0 https://github.com/popcoondev/ai-organization-framework.git`

現時点では npm registry 配布は前提にしない。  
したがって `aof` command は、clone した AOF repo を local tool source として取得し、`npm link` で PATH に出すのが現実的な install path である。

## Full Acquisition And Init Flow

managed-project を初期化する current flow は次である。

```bash
# 1. AOF runtime/source を取得する
git clone --branch v2.1.0 https://github.com/popcoondev/ai-organization-framework.git ~/.local/share/aof/v2.1.0

# 2. AOF toolchain を入れる
cd ~/.local/share/aof/v2.1.0
npm install

# 3. aof command を PATH に出す
npm link

# 4. 対象プロジェクトへ移動する
cd /path/to/your-project

# 5. managed-project として初期化する
aof init --topology managed-project
```

この flow の意味は次のとおりである。

1. AOF を spec 参照先ではなく **local runtime tool** として取得する
2. `aof` command を現在の shell から使えるようにする
3. 対象 repo に `.aof/` skeleton と AI recognition packet を配置する

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
  organization.json
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
- `.aof/organization.json`

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
  "bootstrap_format_version": 1,
  "aof_version": "2.x",
  "topology": "managed-project",
  "install_mode": "runtime-on",
  "write_target": "aof/state",
  "orientation_ref": ".aof/context/active/project-orientation.json",
  "organization_ref": ".aof/organization.json",
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

## Current Bootstrap Command

現在の prototype では、次の command を bootstrap entrypoint として扱う。

```bash
node ./src/cli.js init \
  --project /path/to/repo \
  --topology managed-project \
  --write-target aof/state
```

既存 project の `.aof/` を新しい bootstrap shape に合わせる時は、次を upgrade entrypoint として扱う。

```bash
node ./src/cli.js upgrade \
  --project /path/to/repo
```

この command がやること:

1. `.aof/` skeleton を生成する
2. `project-bootstrap.json` を書く
3. `project-orientation.json` の template を出す
4. `organization.json` の default organization template を出す
5. goals / tasks の最小 seed file を出す
6. topology-aware write policy を明示する

`upgrade` がやること:

1. 既存 `project-bootstrap.json` を読む
2. `bootstrap_format_version` と `aof_version` を current AOF に更新する
3. canonical refs と write policy を補完する
4. 欠けている `organization.json` を安全に補う
5. 欠けている `project-orientation.json` / goals / `recent-confirmation-window.json` を安全に補う
6. topology を保ったまま installer state を最新 shape に migrate する

## Non-Goals

この文書は次をまだ要求しない。

1. full autonomous AI onboarding
2. project-wide code summarization の自動生成
3. bootstrap 後の full repo summarization pipeline の自動生成
4. all prompt templates の fully opinionated seed

まず必要なのは、**AOF を別 repo に入れる時の canonical file set と AI recognition packet を固定すること** である。
