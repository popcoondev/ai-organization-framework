# Quickstart

この文書は、AI Organization Framework を初めて触る人向けの最短手順である。  
目標は、bundled example を local で 1 回最後まで流し、`run -> answer -> council-exec` の感触を掴むことにある。

## Prerequisites

- Node.js 22 LTS 推奨
- Node.js 24 は未検証だが許容範囲
- Node.js 25 は非推奨
- `npm`
- local shell

依存を入れる。

`AOF` の CI は Node.js 22 で検証している。  
ローカルで Node.js 25 を使うと、並列 standalone CLI 実行時に一時的な read/import instability が出ることがあるため、少なくとも現時点では Node.js 22 LTS を使う。

```bash
npm install
```

## Install `aof` For Another Project

bundled example ではなく別プロジェクトへ AOF を持ち込む場合、現在の canonical acquisition path は GitHub tag から local tool source を取得する方式である。

```bash
git clone --branch v5.0.0 https://github.com/popcoondev/ai-organization-framework.git ~/.local/share/aof/v5.0.0
cd ~/.local/share/aof/v5.0.0
npm install
npm link
```

その後、対象 repo で次を実行する。

```bash
aof init --topology managed-project
```

すでに `.aof/` を持つ repo を新しい installer shape に寄せる時は、次を使う。

```bash
aof upgrade
```

## Fastest First Run

まずは AIDLC example を使う。

### 1. Start A Session

```bash
node ./src/cli.js run "アプリAをどう収益化するべきか" --project ./examples/aidlc-template
```

これで `.aof/sessions/` に session file が作られる。  
最新 session は次で探せる。

```bash
ls -t ./examples/aidlc-template/.aof/sessions | head -n 1
```

以下の例では、その session path を `<SESSION>` と書く。

### 2. Answer Clarification

```bash
node ./src/cli.js answer \
  --session ./examples/aidlc-template/.aof/sessions/<SESSION> \
  --response "写真共有アプリA。月間アクティブユーザーは約12万人で、主な利用者は20代の一般ユーザー" \
  --response "3か月以内に、継続可能な初期収益モデルを1つ検証したい" \
  --response "既存の無料ユーザー体験を大きく悪化させず、広告依存だけにはしたくない"
```

### 3. Inspect The Council Plan

```bash
node ./src/cli.js council \
  --session ./examples/aidlc-template/.aof/sessions/<SESSION> \
  --stage planning
```

### 4. Execute Planning

最初は mock provider で十分である。

```bash
node ./src/cli.js council-exec \
  --session ./examples/aidlc-template/.aof/sessions/<SESSION> \
  --stage planning \
  --invoke-model \
  --provider mock
```

approval まで流したい場合は次も実行する。

```bash
node ./src/cli.js council-exec \
  --session ./examples/aidlc-template/.aof/sessions/<SESSION> \
  --stage approval \
  --invoke-model \
  --provider mock
```

## One-Shot Verification

local で一気に flow を見たい場合は `live-verify` が最短である。

```bash
node ./src/cli.js live-verify \
  --project ./examples/aidlc-template \
  --provider mock \
  --artifact-dir /tmp/aof-quickstart \
  --include-approval
```

これで `provider-check.json`、`planning-exec.json`、`approval-exec.json`、`verification-bundle.json`、`verification-report.md` が `/tmp/aof-quickstart` に出る。

## Human Recognition Interface

`v2.6` 以降の Human Visibility Layer を local viewer で見たい場合は、まず runtime から visibility packet を生成し、その JSON を `visibility-serve` に渡す。

```bash
node ./src/cli.js visibility-export --project .
```

default では次に生成される:

- `.aof/artifacts/visibility/current/status-card.json`
- `.aof/artifacts/visibility/current/timeline-feed.json`
- `.aof/artifacts/visibility/current/flow-snapshot.json`
- `.aof/artifacts/visibility/current/mission-control.json`
- `.aof/artifacts/visibility/current/operator-brief.json`
- `.aof/artifacts/visibility/current/operator-progress.json`
- `.aof/artifacts/visibility/current/tree-position.json`
- `.aof/artifacts/visibility/current/evidence-drill-down.json`

viewer を開く前に、まず runtime の current answer を読みたい場合は `operator-brief` を使う。

```bash
node ./src/cli.js operator-brief --project .
```

これは `何が起きているか / なぜそうなのか / 何が詰まっているか / 次に何をするか` を 1 packet で返す。  
`v3.8` 以降の main operator path はこの brief で、viewer は補助面として扱う。

`v3.9` 以降の最短 path は、runtime から viewer までを 1 command でつなぐ `visibility-session` である。

```bash
node ./src/cli.js visibility-session --project . --port 4174 --open-browser
```

これは次をまとめて行う。

- current visibility packet を export する
- viewer session を起動する
- browser を自動で開く

viewer では `Now` に加えて、

- `What Changed`
- `Where In The Tree`
- `Evidence Drill-Down`

が同じ packet から読める。

manual に繋ぎたい場合だけ `visibility-serve` を使う。

```bash
node ./src/cli.js visibility-serve \
  --status-input ./.aof/artifacts/visibility/current/status-card.json \
  --timeline-input ./.aof/artifacts/visibility/current/timeline-feed.json \
  --flow-input ./.aof/artifacts/visibility/current/flow-snapshot.json \
  --mission-input ./.aof/artifacts/visibility/current/mission-control.json \
  --progress-input ./.aof/artifacts/visibility/current/operator-progress.json \
  --tree-input ./.aof/artifacts/visibility/current/tree-position.json \
  --evidence-input ./.aof/artifacts/visibility/current/evidence-drill-down.json \
  --port 4174
```

起動後は返ってきた `url` を browser で開けばよい。  
viewer 自体は read-only で、`status / timeline / flow` に加えて Mission Control, progress, tree-position, evidence drill-down surface を表示する。  
`mission-control.json` がない場合でも viewer は fallback で開けるが、artifact lineage / blocker / next-action / progress / tree position を正しく見たい場合は packet 一式を渡す。

## Non-AIDLC Example

AIDLC 以外の最小例を見たい場合は generic template を使う。

```bash
node ./src/cli.js run "Improve workshop participation quality" --project ./examples/generic-template
```

この template は `service-design` workflow と domain-specific clarification override の最小例である。  
adaptation は `project-orientation.json` と bootstrap packet を中心に行う。

## When To Use Framing-Only vs Runtime-On

まず framing だけ固めたい task では、AOF の問いかけ方を使うだけでもよい。  
Need / Intent / Context を整えることが目的で、planning / approval の履歴をまだ残さなくてよい場合は framing-only で十分である。

一方で、次のどれかが欲しい場合は runtime を起動する。

- clarification / planning / approval の履歴を session に残したい
- routing mode や reopen を測定したい
- outcome を `outcome-report` で session に書き戻したい
- external signal や escalation を trace したい

運用上の重要な制約として、`v1.1` 時点の runtime は `1 session = serial mutation` 前提である。  
同じ session に対して `answer`、`council-exec`、`signal`、`escalation-resolve`、`outcome-report` を同時に走らせないこと。
プロセスが異常終了して `<session>.lock` が残った場合は、その lock file を手動削除してから再試行する。

## What To Read Next

- command 一覧: [cli-reference.md](./cli-reference.md)
- core model: [aof-core-model.md](./aof-core-model.md)
- operations model: [aof-operations-model.md](./aof-operations-model.md)
- project bootstrap model: [aof-project-bootstrap-model.md](./aof-project-bootstrap-model.md)
- `v3.9` scope と gate: [v3.9-release-definition.md](./v3.9-release-definition.md)
